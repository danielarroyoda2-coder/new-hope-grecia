import React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const categories = [
  "Blusas",
  "Camisas",
  "Vestidos",
  "Pantalones",
  "Enaguas",
  "Accesorios",
  "Sombreros",
  "Vestidos de baño",
];

const allowedEmails = [
  "daniel.arroyo.da2@roche.com",
  "anacatalinajimenez88@gmail.com",
  "outlethopecr@gmail.com",
];

const initialForm = {
  name: "",
  price: "",
  stock: "",
  image: "",
  category: "Vestidos",
  sizes: "",
  colors: "",
};

const initialCheckout = {
  customerName: "",
  customerPhone: "",
  deliveryType: "retiro_local",
  deliveryAddress: "",
};

const initialCheckoutErrors = {
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
};

const fallbackImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="#f3f4f6"/>
    <rect x="220" y="280" width="360" height="360" rx="28" fill="#e5e7eb"/>
    <text x="400" y="500" text-anchor="middle" font-family="Arial" font-size="46" fill="#6b7280">
      Imagen no disponible
    </text>
  </svg>
`);

export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersMessage, setOrdersMessage] = useState("");
  const [highlightedOrders, setHighlightedOrders] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [session, setSession] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [lastOrderSummary, setLastOrderSummary] = useState(null);

  const [checkoutData, setCheckoutData] = useState(initialCheckout);
  const [checkoutErrors, setCheckoutErrors] = useState(initialCheckoutErrors);

  const [newOrderAlert, setNewOrderAlert] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [ordersTab, setOrdersTab] = useState("pendientes");

  useEffect(() => {
    getProducts();
    getOrders();

    const savedCart = localStorage.getItem("bnhg_cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession || null);
      setUserEmail(currentSession?.user?.email || "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession || null);
      setUserEmail(currentSession?.user?.email || "");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("bnhg_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    function enableAudio() {
      setAudioEnabled(true);
      window.removeEventListener("click", enableAudio);
    }

    window.addEventListener("click", enableAudio);

    return () => {
      window.removeEventListener("click", enableAudio);
    };
  }, []);

  const isAllowedUser =
    session && allowedEmails.includes((userEmail || "").toLowerCase());

  useEffect(() => {
    if (!isAllowedUser) return;

    const channel = supabase
      .channel("pedidos-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Pedidos",
        },
        async (payload) => {
          const order = payload.new;

          setNewOrderAlert(
            `Nuevo pedido recibido: ${order.order_number || "sin número"}`
          );

          setHighlightedOrders((current) => {
            const exists = current.some((item) => item.id === order.id);
            if (exists) return current;
            return [order, ...current];
          });

          await getOrders();

          if (audioEnabled) {
            playNewOrderSound();
          }

          setTimeout(() => {
            setNewOrderAlert("");
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAllowedUser, audioEnabled]);

  async function getProducts() {
    const { data, error } = await supabase
      .from("Productos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("No se pudieron cargar los productos.");
    } else {
      setProducts(data || []);
    }
  }

  function getPendingOrders(data) {
    return (data || []).filter((order) => order.status === "pendiente");
  }

  async function getOrders() {
    const { data, error } = await supabase
      .from("Pedidos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setOrdersMessage("No se pudieron cargar los pedidos.");
    } else {
      setOrders(data || []);
      setHighlightedOrders(getPendingOrders(data));
    }
  }

  function playNewOrderSound() {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAA////AAAAAP///wAAAAD///8AAAAA////AAAAAP///wAAAAD///8AAAAA"
      );
      audio.play().catch(() => {});
    } catch (error) {
      console.error("No se pudo reproducir el sonido", error);
    }
  }

  function generateOrderNumber() {
    return `NHG-${Date.now()}`;
  }

  function getShippingCost(deliveryType) {
    if (deliveryType === "gam") return 2500;
    if (deliveryType === "fuera_gam") return 3500;
    return 0;
  }

  function getDeliveryLabel(deliveryType) {
    if (deliveryType === "gam") return "Envío dentro del GAM";
    if (deliveryType === "fuera_gam") return "Envío fuera del GAM";
    return "Retiro en local físico";
  }

  function normalizeOptionText(value) {
    if (!value) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  }

  function normalizePhone(value) {
    return value.replace(/[^\d]/g, "");
  }

  function formatPhoneDisplay(value) {
    const digits = normalizePhone(value).slice(0, 8);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  function validateCheckout(data = checkoutData) {
    const errors = {
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
    };

    if (!data.customerName.trim()) {
      errors.customerName = "El nombre es obligatorio.";
    }

    const phoneDigits = normalizePhone(data.customerPhone);
    if (!phoneDigits) {
      errors.customerPhone = "El celular es obligatorio.";
    } else if (phoneDigits.length !== 8) {
      errors.customerPhone = "El celular debe tener 8 dígitos.";
    }

    if (
      data.deliveryType !== "retiro_local" &&
      !data.deliveryAddress.trim()
    ) {
      errors.deliveryAddress = "La dirección de entrega es obligatoria.";
    }

    setCheckoutErrors(errors);

    return !errors.customerName && !errors.customerPhone && !errors.deliveryAddress;
  }

  async function createOrder(method) {
    if (!cart.length) {
      alert("El carrito está vacío.");
      return null;
    }

    const valid = validateCheckout();
    if (!valid) {
      return null;
    }

    const orderNumber = generateOrderNumber();

    const orderItems = cart.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: Number(item.price),
      subtotal: Number(item.price) * item.qty,
    }));

    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0
    );

    const shippingCost = getShippingCost(checkoutData.deliveryType);
    const total = subtotal + shippingCost;

    const { error: orderError } = await supabase.from("Pedidos").insert([
      {
        order_number: orderNumber,
        customer_name: checkoutData.customerName.trim(),
        customer_phone: formatPhoneDisplay(checkoutData.customerPhone),
        items: orderItems,
        total,
        payment_method: method,
        status: "pendiente",
        delivery_type: checkoutData.deliveryType,
        delivery_address:
          checkoutData.deliveryType === "retiro_local"
            ? ""
            : checkoutData.deliveryAddress.trim(),
        shipping_cost: shippingCost,
      },
    ]);

    if (orderError) {
      console.error(orderError);
      alert("Error guardando el pedido");
      return null;
    }

    for (const item of cart) {
      const newStock = Math.max(Number(item.stock) - Number(item.qty), 0);

      const { error: stockError } = await supabase
        .from("Productos")
        .update({ stock: newStock })
        .eq("id", item.id);

      if (stockError) {
        console.error(stockError);
      }
    }

    const summary = {
      orderNumber,
      method,
      subtotal,
      shippingCost,
      total,
      deliveryType: checkoutData.deliveryType,
      deliveryAddress:
        checkoutData.deliveryType === "retiro_local"
          ? ""
          : checkoutData.deliveryAddress.trim(),
      customerName: checkoutData.customerName.trim(),
      customerPhone: formatPhoneDisplay(checkoutData.customerPhone),
      items: orderItems,
    };

    setLastOrderSummary(summary);
    setSuccessMessage(`Compra exitosa. Tu número de pedido es ${orderNumber}.`);
    clearCart();
    setCheckoutData(initialCheckout);
    setCheckoutErrors(initialCheckoutErrors);
    setCartOpen(false);
    await getProducts();
    await getOrders();

    return summary;
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase
      .from("Pedidos")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("No se pudo actualizar el estado del pedido.");
      return;
    }

    setHighlightedOrders((current) =>
      newStatus === "pendiente"
        ? current
        : current.filter((order) => order.id !== orderId)
    );

    await getOrders();
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCheckoutChange(e) {
    const { name, value } = e.target;

    if (name === "customerPhone") {
      const formatted = formatPhoneDisplay(value);
      setCheckoutData((current) => ({
        ...current,
        [name]: formatted,
      }));

      if (checkoutErrors.customerPhone) {
        validateCheckout({
          ...checkoutData,
          customerPhone: formatted,
        });
      }
      return;
    }

    const nextData = {
      ...checkoutData,
      [name]: value,
    };

    setCheckoutData(nextData);

    if (checkoutErrors[name]) {
      validateCheckout(nextData);
    }

    if (name === "deliveryType" && value === "retiro_local") {
      setCheckoutErrors((current) => ({
        ...current,
        deliveryAddress: "",
      }));
    }
  }

  function handleEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: product.price || "",
      stock: product.stock || "",
      image: product.image || "",
      category: product.category || "Vestidos",
      sizes: normalizeOptionText(product.sizes),
      colors: normalizeOptionText(product.colors),
    });
    setMessage("Editando producto.");
    document.getElementById("admin")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setMessage("Edición cancelada.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!form.name || !form.price || !form.stock || !form.image || !form.category) {
      setMessage("Completá todos los campos.");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name,
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image,
      category: form.category,
      sizes: form.sizes,
      colors: form.colors,
    };

    if (editingId) {
      const { error } = await supabase
        .from("Productos")
        .update(payload)
        .eq("id", editingId);

      setLoading(false);

      if (error) {
        console.error(error);
        setMessage("Hubo un error al actualizar el producto.");
        return;
      }

      setEditingId(null);
      setForm(initialForm);
      setMessage("Producto actualizado correctamente.");
      getProducts();
      return;
    }

    const { error } = await supabase.from("Productos").insert([payload]);

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage("Hubo un error al guardar el producto.");
      return;
    }

    setForm(initialForm);
    setMessage("Producto guardado correctamente.");
    getProducts();
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm("¿Querés eliminar este producto?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("Productos").delete().eq("id", id);

    if (error) {
      console.error(error);
      setMessage("No se pudo eliminar el producto.");
      return;
    }

    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }

    setMessage("Producto eliminado correctamente.");
    getProducts();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!allowedEmails.includes(cleanEmail)) {
      setAuthMessage("Ese correo no tiene permiso para administrar.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: "https://new-hope-grecia.vercel.app",
      },
    });

    if (error) {
      console.error(error);
      setAuthMessage("No se pudo enviar el enlace al correo.");
      return;
    }

    setAuthMessage("Te envié un enlace de ingreso a tu correo.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthMessage("Sesión cerrada.");
  }

  function addToCart(product) {
    if (Number(product.stock) === 0) return;

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: Math.min(item.qty + 1, Number(product.stock)),
              }
            : item
        );
      }

      return [...current, { ...product, qty: 1 }];
    });

    setCartOpen(true);
  }

  function increaseQty(id) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          qty: Math.min(item.qty + 1, Number(item.stock)),
        };
      })
    );
  }

  function decreaseQty(id) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;
          return { ...item, qty: item.qty - 1 };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0),
    [cart]
  );

  const shippingCost = useMemo(
    () => getShippingCost(checkoutData.deliveryType),
    [checkoutData.deliveryType]
  );

  const cartTotal = useMemo(
    () => cartSubtotal + shippingCost,
    [cartSubtotal, shippingCost]
  );

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "Todos") {
      result = result.filter((product) => product.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((product) =>
        String(product.name || "").toLowerCase().includes(term)
      );
    }

    if (maxPrice !== "") {
      result = result.filter((product) => Number(product.price) <= Number(maxPrice));
    }

    if (onlyAvailable) {
      result = result.filter((product) => Number(product.stock) > 0);
    }

    return result;
  }, [products, selectedCategory, searchTerm, maxPrice, onlyAvailable]);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "pendiente"),
    [orders]
  );

  const paidOrders = useMemo(
    () => orders.filter((order) => order.status === "pagado"),
    [orders]
  );

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "entregado"),
    [orders]
  );

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "entregado"),
    [orders]
  );

  const pendingOrdersCount = useMemo(
    () => pendingOrders.length,
    [pendingOrders]
  );

  const lowStockProducts = useMemo(
    () =>
      products.filter((product) => {
        const stock = Number(product.stock);
        return stock > 0 && stock <= 4;
      }),
    [products]
  );

  const currentOrdersList = useMemo(() => {
    if (ordersTab === "pendientes") return pendingOrders;
    if (ordersTab === "pagados") return paidOrders;
    return deliveredOrders;
  }, [ordersTab, pendingOrders, paidOrders, deliveredOrders]);

  function stockLabel(stock) {
    const s = Number(stock);
    if (s === 0) return "❌ Agotado";
    if (s <= 4) return `⚠️ Stock bajo: ${s}`;
    return `Stock: ${s}`;
  }

  function getStatusLabel(status) {
    if (status === "pagado") return "Pagado";
    if (status === "entregado") return "Entregado";
    return "Pendiente";
  }

  function buildOrderWhatsappMessage(orderSummary) {
    return encodeURIComponent(
      `Nuevo pedido 🛍️

Número de pedido: ${orderSummary.orderNumber}
Cliente: ${orderSummary.customerName}
Celular: ${orderSummary.customerPhone}
Método de pago: ${orderSummary.method}
Entrega: ${getDeliveryLabel(orderSummary.deliveryType)}
${orderSummary.deliveryAddress ? `Dirección: ${orderSummary.deliveryAddress}` : ""}
Subtotal: ₡${orderSummary.subtotal}
Envío: ₡${orderSummary.shippingCost}
Total: ₡${orderSummary.total}

Productos:
${orderSummary.items
  .map((item) => `- ${item.name} x${item.qty} = ₡${item.subtotal}`)
  .join("\n")}`
    );
  }

  function buildSupportWhatsappMessage() {
    return encodeURIComponent(
      "Hola, quiero información sobre Boutique New Hope Grecia."
    );
  }

  function handleImageError(e) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }

  function renderProductCard(product) {
    return (
      <article className="product-card" key={product.id}>
        <div className="product-image-wrap">
          <img
            src={product.image || fallbackImage}
            alt={product.name}
            onError={handleImageError}
          />
        </div>

        <div className="product-body">
          <p className="product-category">{product.category}</p>
          <h4>{product.name}</h4>

          <div className="product-row">
            <span className="price">₡{product.price}</span>
            <span className="stock">{stockLabel(product.stock)}</span>
          </div>

          <button
            className="btn btn-primary full"
            type="button"
            onClick={() => addToCart(product)}
            disabled={Number(product.stock) === 0}
          >
            {Number(product.stock) === 0 ? "Agotado" : "Agregar al carrito"}
          </button>
        </div>
      </article>
    );
  }

  function renderOrderCard(order) {
    return (
      <div className="admin-list-item order-card" key={order.id}>
        <div className="admin-list-info">
          <div className="order-top-line">
            <strong>{order.order_number || "Sin número"}</strong>
            <span className={`status-chip status-${order.status || "pendiente"}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          <span>Cliente: {order.customer_name}</span>
          <span>Celular: {order.customer_phone}</span>
          <span>Método: {order.payment_method}</span>
          <span>
            Entrega: {getDeliveryLabel(order.delivery_type || "retiro_local")}
          </span>
          {order.delivery_address ? (
            <span>Dirección: {order.delivery_address}</span>
          ) : null}
        </div>

        <div className="admin-list-meta">
          <span>Total: ₡{order.total}</span>
          <span>Envío: ₡{order.shipping_cost || 0}</span>
          <span>
            {order.created_at ? new Date(order.created_at).toLocaleString() : ""}
          </span>
        </div>

        <div className="admin-list-info">
          <strong>Productos</strong>
          {Array.isArray(order.items) ? (
            order.items.map((item, index) => (
              <span key={index}>
                {item.name} x{item.qty} = ₡{item.subtotal}
              </span>
            ))
          ) : (
            <span>Sin detalle</span>
          )}
        </div>

        <div className="admin-list-buttons">
          <button
            className="btn btn-secondary small-btn"
            type="button"
            onClick={() => updateOrderStatus(order.id, "pendiente")}
          >
            Pendiente
          </button>
          <button
            className="btn btn-primary small-btn"
            type="button"
            onClick={() => updateOrderStatus(order.id, "pagado")}
          >
            Pagado
          </button>
          <button
            className="btn btn-transfer small-btn"
            type="button"
            onClick={() => updateOrderStatus(order.id, "entregado")}
          >
            Entregado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="site">
      <header className="topbar">
        <div className="container topbar-inner">
          <div>
            <p className="eyebrow">Grecia, Costa Rica</p>
            <h1 className="brand">Boutique New Hope Grecia</h1>
          </div>

          <div className="nav-cart-wrap">
            <nav className="nav">
              <a href="#catalogo">Catálogo</a>
              <a href="#destacados">Destacados</a>
              <a href="#admin">Administrar</a>
            </nav>

            <button
              className="cart-button"
              type="button"
              onClick={() => setCartOpen(true)}
            >
              Carrito ({cartCount})
            </button>
          </div>
        </div>
      </header>

      {newOrderAlert ? (
        <section className="section" style={{ padding: "16px 0 0" }}>
          <div className="container">
            <div className="top-alert">
              🔔 {newOrderAlert}
            </div>
          </div>
        </section>
      ) : null}

      {isAllowedUser && highlightedOrders.length > 0 ? (
        <section className="section" style={{ padding: "16px 0 0" }}>
          <div className="container">
            <div className="pending-banner">
              <h3>Pedidos pendientes</h3>

              <div className="pending-banner-grid">
                {highlightedOrders.map((order) => (
                  <div key={order.id} className="pending-banner-item">
                    <strong>{order.order_number || "Sin número"}</strong>
                    <div>Cliente: {order.customer_name}</div>
                    <div>Celular: {order.customer_phone}</div>
                    <div>Total: ₡{order.total}</div>
                    <div>Método: {order.payment_method}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="badge">Nueva colección</span>
            <h2>Moda online con estilo profesional</h2>
            <p>
              Blusas, camisas de hombre y mujer, vestidos, pantalones, enaguas,
              accesorios, sombreros y nuestro top en ventas: vestidos de baño.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#catalogo">
                Ver catálogo
              </a>
              <a className="btn btn-secondary" href="#admin">
                Panel admin
              </a>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-stat">
              <strong>{products.length}</strong>
              <span>Productos cargados en la base de datos</span>
            </div>
            <div className="hero-stat">
              <strong>{isAllowedUser ? "Activo" : "Protegido"}</strong>
              <span>Acceso administrativo por correo</span>
            </div>
            <div className="hero-stat">
              <strong>{cartCount}</strong>
              <span>Productos en el carrito</span>
            </div>
          </div>
        </div>
      </section>

      {successMessage ? (
        <section className="section">
          <div className="container">
            <div className="admin-box admin-box-full">
              <div>
                <p className="section-kicker">Compra exitosa</p>
                <h3>{successMessage}</h3>
                {lastOrderSummary ? (
                  <div className="admin-text purchase-summary">
                    <p><strong>Pedido:</strong> {lastOrderSummary.orderNumber}</p>
                    <p><strong>Cliente:</strong> {lastOrderSummary.customerName}</p>
                    <p><strong>Celular:</strong> {lastOrderSummary.customerPhone}</p>
                    <p><strong>Total:</strong> ₡{lastOrderSummary.total}</p>
                    <p><strong>Método:</strong> {lastOrderSummary.method}</p>
                    <p><strong>Entrega:</strong> {getDeliveryLabel(lastOrderSummary.deliveryType)}</p>
                    {lastOrderSummary.deliveryAddress ? (
                      <p><strong>Dirección:</strong> {lastOrderSummary.deliveryAddress}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {lastOrderSummary ? (
                <div className="admin-actions">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      const msg = buildOrderWhatsappMessage(lastOrderSummary);
                      window.open(`https://wa.me/50670477509?text=${msg}`, "_blank");
                    }}
                  >
                    Enviar pedido por WhatsApp
                  </button>

                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setSuccessMessage("")}
                  >
                    Cerrar mensaje
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" id="destacados">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="section-kicker">Más vendidos</p>
              <h3>Productos destacados</h3>
            </div>
            <span className="soft-pill">Top: vestidos de baño</span>
          </div>

          <div className="product-grid">
            {products.length > 0 ? (
              products.slice(0, 8).map((product) => renderProductCard(product))
            ) : (
              <div className="empty-state">
                Todavía no hay productos cargados. Usá el panel de administración
                de abajo para agregar el primero.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section light" id="catalogo">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="section-kicker">Catálogo</p>
              <h3>Categorías principales</h3>
            </div>
          </div>

          <div className="catalog-toolbar">
            <div className="field">
              <label>Buscar por nombre</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej. vestido rojo"
              />
            </div>

            <div className="field">
              <label>Precio máximo</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Ej. 20000"
              />
            </div>

            <div className="field checkbox-field">
              <label>Disponibilidad</label>
              <button
                type="button"
                className={`toggle-btn ${onlyAvailable ? "toggle-active" : ""}`}
                onClick={() => setOnlyAvailable((current) => !current)}
              >
                {onlyAvailable ? "Solo disponibles: Sí" : "Solo disponibles: No"}
              </button>
            </div>
          </div>

          <div className="category-grid">
            <button
              type="button"
              className={`category-card ${selectedCategory === "Todos" ? "category-active" : ""}`}
              onClick={() => setSelectedCategory("Todos")}
            >
              Todos
            </button>

            {categories.map((item) => (
              <button
                type="button"
                className={`category-card ${selectedCategory === item ? "category-active" : ""}`}
                key={item}
                onClick={() => setSelectedCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="catalog-results">
            Mostrando <strong>{filteredProducts.length}</strong> producto(s)
          </div>

          <div className="product-grid" style={{ marginTop: "24px" }}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => renderProductCard(product))
            ) : (
              <div className="empty-state">
                No hay productos disponibles con esos filtros.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section" id="admin">
        <div className="container">
          {!isAllowedUser ? (
            <div className="admin-box admin-box-full">
              <div>
                <p className="section-kicker">Acceso administrativo</p>
                <h3>Ingresar con correo</h3>
                <p className="admin-text">
                  Solo los correos autorizados pueden entrar al panel de administración.
                </p>
              </div>

              <form className="admin-form" onSubmit={handleLogin}>
                <div className="form-grid">
                  <div className="field field-full">
                    <label>Correo autorizado</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@gmail.com"
                    />
                  </div>
                </div>

                <div className="admin-actions">
                  <button className="btn btn-primary" type="submit">
                    Enviar enlace de ingreso
                  </button>
                </div>

                {authMessage ? <p className="status-message">{authMessage}</p> : null}
              </form>
            </div>
          ) : (
            <div className="admin-box admin-box-full">
              <div className="admin-top-row">
                <div>
                  <p className="section-kicker">Administración</p>
                  <h3>{editingId ? "Editar producto" : "Panel de productos"}</h3>
                  <p className="admin-text">
                    Sesión iniciada como <strong>{userEmail}</strong>.
                  </p>
                </div>

                <button className="btn btn-secondary" type="button" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>

              <form className="admin-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>Nombre del producto *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ej. Vestido rojo"
                    />
                  </div>

                  <div className="field">
                    <label>Precio *</label>
                    <input
                      name="price"
                      type="number"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="18900"
                    />
                  </div>

                  <div className="field">
                    <label>Stock *</label>
                    <input
                      name="stock"
                      type="number"
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="10"
                    />
                  </div>

                  <div className="field">
                    <label>Categoría *</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field field-full">
                    <label>URL de imagen *</label>
                    <input
                      name="image"
                      value={form.image}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="field field-full">
                    <label>Tallas disponibles</label>
                    <input
                      name="sizes"
                      value={form.sizes}
                      onChange={handleChange}
                      placeholder="XS,S,M,L,XL"
                    />
                  </div>

                  <div className="field field-full">
                    <label>Colores disponibles</label>
                    <input
                      name="colors"
                      value={form.colors}
                      onChange={handleChange}
                      placeholder="Negro,Blanco,Rojo"
                    />
                  </div>
                </div>

                <div className="admin-actions">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading
                      ? "Guardando..."
                      : editingId
                      ? "Guardar cambios"
                      : "Guardar producto"}
                  </button>

                  {editingId ? (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={handleCancelEdit}
                    >
                      Cancelar edición
                    </button>
                  ) : (
                    <a className="btn btn-secondary" href="#destacados">
                      Ver productos
                    </a>
                  )}
                </div>

                {message ? <p className="status-message">{message}</p> : null}
              </form>
            </div>
          )}
        </div>
      </section>

      {isAllowedUser && lowStockProducts.length > 0 ? (
        <section className="section light">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="section-kicker">Reposición</p>
                <h3>Productos por reponer</h3>
              </div>
              <span className="soft-pill">{lowStockProducts.length} con stock bajo</span>
            </div>

            <div className="replenish-grid">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="replenish-card">
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                  <span>{stockLabel(product.stock)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {isAllowedUser ? (
        <section className="section light">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="section-kicker">Base de datos</p>
                <h3>Productos cargados</h3>
              </div>
            </div>

            <div className="admin-list">
              {products.length > 0 ? (
                products.map((product) => (
                  <div className="admin-list-item" key={product.id}>
                    <img
                      src={product.image || fallbackImage}
                      alt={product.name}
                      onError={handleImageError}
                    />
                    <div className="admin-list-info">
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                      {product.sizes ? (
                        <span>Tallas: {normalizeOptionText(product.sizes)}</span>
                      ) : null}
                      {product.colors ? (
                        <span>Colores: {normalizeOptionText(product.colors)}</span>
                      ) : null}
                    </div>
                    <div className="admin-list-meta">
                      <span>₡{product.price}</span>
                      <span>{stockLabel(product.stock)}</span>
                    </div>
                    <div className="admin-list-buttons">
                      <button
                        className="btn btn-secondary small-btn"
                        type="button"
                        onClick={() => handleEdit(product)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-primary small-btn"
                        type="button"
                        onClick={() => handleDelete(product.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  Aún no hay productos guardados en la base de datos.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {isAllowedUser ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="section-kicker">Pedidos</p>
                <h3>Panel de pedidos</h3>
                <p className="admin-text" style={{ marginTop: "8px" }}>
                  Activos: <strong>{activeOrders.length}</strong> | Pendientes:{" "}
                  <strong>{pendingOrdersCount}</strong>
                </p>
              </div>
            </div>

            {ordersMessage ? <p className="status-message">{ordersMessage}</p> : null}

            <div className="orders-tabs">
              <button
                type="button"
                className={`orders-tab ${ordersTab === "pendientes" ? "orders-tab-active" : ""}`}
                onClick={() => setOrdersTab("pendientes")}
              >
                Pendientes ({pendingOrders.length})
              </button>
              <button
                type="button"
                className={`orders-tab ${ordersTab === "pagados" ? "orders-tab-active" : ""}`}
                onClick={() => setOrdersTab("pagados")}
              >
                Pagados ({paidOrders.length})
              </button>
              <button
                type="button"
                className={`orders-tab ${ordersTab === "entregados" ? "orders-tab-active" : ""}`}
                onClick={() => setOrdersTab("entregados")}
              >
                Entregados ({deliveredOrders.length})
              </button>
            </div>

            <div className="admin-list">
              {currentOrdersList.length > 0 ? (
                currentOrdersList.map((order) => renderOrderCard(order))
              ) : (
                <div className="empty-state">
                  No hay pedidos en esta sección.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {cartOpen ? (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>Tu carrito</h3>
              <button
                className="cart-close"
                type="button"
                onClick={() => setCartOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-state">Tu carrito está vacío.</div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <img
                        src={item.image || fallbackImage}
                        alt={item.name}
                        onError={handleImageError}
                      />
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>₡{item.price}</span>
                        <span>Stock: {item.stock}</span>
                      </div>

                      <div className="cart-item-actions">
                        <div className="qty-box">
                          <button type="button" onClick={() => decreaseQty(item.id)}>
                            -
                          </button>
                          <span>{item.qty}</span>
                          <button type="button" onClick={() => increaseQty(item.id)}>
                            +
                          </button>
                        </div>
                        <button
                          className="remove-btn"
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="checkout-card">
                    <h4>Datos de compra</h4>

                    <div className="form-grid">
                      <div className="field">
                        <label>Nombre *</label>
                        <input
                          name="customerName"
                          value={checkoutData.customerName}
                          onChange={handleCheckoutChange}
                          onBlur={() => validateCheckout()}
                          placeholder="Tu nombre"
                          className={checkoutErrors.customerName ? "input-error" : ""}
                        />
                        {checkoutErrors.customerName ? (
                          <p className="field-error">{checkoutErrors.customerName}</p>
                        ) : null}
                      </div>

                      <div className="field">
                        <label>Celular *</label>
                        <input
                          name="customerPhone"
                          value={checkoutData.customerPhone}
                          onChange={handleCheckoutChange}
                          onBlur={() => validateCheckout()}
                          placeholder="8888-8888"
                          className={checkoutErrors.customerPhone ? "input-error" : ""}
                        />
                        {checkoutErrors.customerPhone ? (
                          <p className="field-error">{checkoutErrors.customerPhone}</p>
                        ) : (
                          <p className="field-help">Formato: 8888-8888</p>
                        )}
                      </div>

                      <div className="field field-full">
                        <label>Tipo de entrega *</label>
                        <select
                          name="deliveryType"
                          value={checkoutData.deliveryType}
                          onChange={handleCheckoutChange}
                        >
                          <option value="retiro_local">Retirar en local físico</option>
                          <option value="gam">Envío dentro del GAM - ₡2500</option>
                          <option value="fuera_gam">Envío fuera del GAM - ₡3500</option>
                        </select>
                      </div>

                      {checkoutData.deliveryType !== "retiro_local" ? (
                        <div className="field field-full">
                          <label>Dirección de entrega *</label>
                          <input
                            name="deliveryAddress"
                            value={checkoutData.deliveryAddress}
                            onChange={handleCheckoutChange}
                            onBlur={() => validateCheckout()}
                            placeholder="Provincia, cantón, distrito, señas exactas"
                            className={checkoutErrors.deliveryAddress ? "input-error" : ""}
                          />
                          {checkoutErrors.deliveryAddress ? (
                            <p className="field-error">{checkoutErrors.deliveryAddress}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="checkout-summary">
                      <h5>Resumen antes de confirmar</h5>
                      <div className="summary-line">
                        <span>Productos</span>
                        <strong>{cartCount}</strong>
                      </div>
                      <div className="summary-line">
                        <span>Subtotal</span>
                        <strong>₡{cartSubtotal}</strong>
                      </div>
                      <div className="summary-line">
                        <span>Envío</span>
                        <strong>₡{shippingCost}</strong>
                      </div>
                      <div className="summary-line summary-total">
                        <span>Total</span>
                        <strong>₡{cartTotal}</strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <strong>Subtotal:</strong>
                <span>₡{cartSubtotal}</span>
              </div>

              <div className="cart-total">
                <strong>Envío:</strong>
                <span>₡{shippingCost}</span>
              </div>

              <div className="cart-total">
                <strong>Total:</strong>
                <span>₡{cartTotal}</span>
              </div>

              <div className="cart-footer-buttons">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={clearCart}
                  disabled={!cart.length}
                >
                  Vaciar carrito
                </button>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={async () => {
                    const result = await createOrder("whatsapp");
                    if (!result) return;

                    const msg = buildOrderWhatsappMessage(result);
                    window.open(`https://wa.me/50670477509?text=${msg}`, "_blank");
                  }}
                  disabled={!cart.length}
                >
                  Pedir por WhatsApp
                </button>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={async () => {
                    const result = await createOrder("sinpe");
                    if (!result) return;

                    alert(
                      `Pedido creado ✅

Número: ${result.orderNumber}
Total: ₡${result.total}

SINPE:
7047-7509

Enviá comprobante por WhatsApp`
                    );
                  }}
                  disabled={!cart.length}
                >
                  Pagar con SINPE
                </button>

                <button
                  className="btn btn-transfer"
                  type="button"
                  onClick={async () => {
                    const result = await createOrder("transferencia");
                    if (!result) return;

                    alert(
                      `Pedido creado ✅

Número: ${result.orderNumber}
Total: ₡${result.total}

Banco: BAC
Cuenta: 945904472`
                    );
                  }}
                  disabled={!cart.length}
                >
                  Transferencia
                </button>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={async () => {
                    const result = await createOrder("tarjeta");
                    if (!result) return;

                    alert(
                      `Pedido creado ✅

Número: ${result.orderNumber}
Total: ₡${result.total}

Próximamente pago con tarjeta`
                    );
                  }}
                  disabled={!cart.length}
                >
                  Pagar con tarjeta
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <a
        href={`https://wa.me/50670477509?text=${buildSupportWhatsappMessage()}`}
        target="_blank"
        rel="noreferrer"
        className="whatsapp-float"
        aria-label="WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="28"
          height="28"
          fill="currentColor"
        >
          <path d="M19.11 17.2c-.27-.13-1.58-.78-1.82-.87-.24-.09-.42-.13-.6.13-.18.27-.69.87-.85 1.04-.16.18-.31.2-.58.07-.27-.13-1.12-.41-2.13-1.32-.79-.7-1.32-1.56-1.47-1.82-.16-.27-.02-.41.11-.54.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.53-.44-.46-.6-.47h-.51c-.18 0-.47.07-.72.34-.24.27-.94.92-.94 2.24 0 1.32.96 2.59 1.09 2.77.13.18 1.88 2.87 4.56 4.02.64.27 1.14.43 1.53.55.64.2 1.22.17 1.68.1.51-.08 1.58-.64 1.8-1.26.22-.62.22-1.15.15-1.26-.07-.11-.24-.18-.51-.31zM16.03 3C8.84 3 3 8.74 3 15.82c0 2.49.73 4.92 2.11 7l-1.38 5.02 5.17-1.35a13.17 13.17 0 0 0 6.13 1.54h.01c7.18 0 13.02-5.74 13.02-12.82C28.06 8.74 23.22 3 16.03 3zm0 23.45h-.01a10.9 10.9 0 0 1-5.56-1.53l-.4-.24-3.07.8.82-2.97-.26-.42a10.73 10.73 0 0 1-1.66-5.66c0-5.92 4.85-10.74 10.82-10.74 5.96 0 10.81 4.82 10.81 10.74 0 5.92-4.85 10.74-10.79 10.74z" />
        </svg>
      </a>
    </div>
  );
}
