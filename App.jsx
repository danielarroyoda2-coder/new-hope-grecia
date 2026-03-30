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

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"];

const colors = [
  "Negro",
  "Blanco",
  "Gris",
  "Azul",
  "Azul marino",
  "Celeste",
  "Turquesa",
  "Rojo",
  "Rosado",
  "Fucsia",
  "Verde",
  "Verde oliva",
  "Verde menta",
  "Amarillo",
  "Naranja",
  "Beige",
  "Café",
  "Marrón",
  "Morado",
  "Lila",
  "Vino",
  "Bordó",
  "Nude",
  "Crema",
  "Arena",
  "Mostaza",
  "Coral",
  "Terracota",
  "Denim",
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
};

const initialCheckout = {
  customerName: "",
  customerPhone: "",
  deliveryType: "retiro_local",
  deliveryAddress: "",
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersMessage, setOrdersMessage] = useState("");

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
  const [successMessage, setSuccessMessage] = useState("");
  const [lastOrderSummary, setLastOrderSummary] = useState(null);

  const [checkoutData, setCheckoutData] = useState(initialCheckout);

  const [newOrderAlert, setNewOrderAlert] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [productSelections, setProductSelections] = useState({});

  useEffect(() => {
    getProducts();
    getOrders();

    const savedCart = localStorage.getItem("bnhg_cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    const savedSelections = localStorage.getItem("bnhg_product_selections");
    if (savedSelections) {
      setProductSelections(JSON.parse(savedSelections));
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
    localStorage.setItem("bnhg_product_selections", JSON.stringify(productSelections));
  }, [productSelections]);

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

  function getProductSelection(productId) {
    return (
      productSelections[productId] || {
        size: "M",
        color: "Negro",
      }
    );
  }

  function handleProductSelectionChange(productId, field, value) {
    setProductSelections((current) => ({
      ...current,
      [productId]: {
        ...getProductSelection(productId),
        [field]: value,
      },
    }));
  }

  async function createOrder(method) {
    if (!cart.length) {
      alert("El carrito está vacío.");
      return null;
    }

    if (!checkoutData.customerName.trim() || !checkoutData.customerPhone.trim()) {
      alert("Completá nombre y celular.");
      return null;
    }

    if (
      checkoutData.deliveryType !== "retiro_local" &&
      !checkoutData.deliveryAddress.trim()
    ) {
      alert("Completá la dirección de entrega.");
      return null;
    }

    const orderNumber = generateOrderNumber();

    const orderItems = cart.map((item) => ({
      id: item.id,
      cartKey: item.cartKey,
      name: item.name,
      qty: item.qty,
      size: item.size,
      color: item.color,
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
        customer_phone: checkoutData.customerPhone.trim(),
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
      customerPhone: checkoutData.customerPhone.trim(),
      items: orderItems,
    };

    setLastOrderSummary(summary);
    setSuccessMessage(`Compra exitosa. Tu número de pedido es ${orderNumber}.`);
    clearCart();
    setCheckoutData(initialCheckout);
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
    setCheckoutData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: product.price || "",
      stock: product.stock || "",
      image: product.image || "",
      category: product.category || "Vestidos",
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

    if (editingId) {
      const { error } = await supabase
        .from("Productos")
        .update({
          name: form.name,
          price: Number(form.price),
          stock: Number(form.stock),
          image: form.image,
          category: form.category,
        })
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

    const { error } = await supabase.from("Productos").insert([
      {
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        image: form.image,
        category: form.category,
      },
    ]);

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

    const selection = getProductSelection(product.id);
    const cartKey = `${product.id}-${selection.size}-${selection.color}`;

    setCart((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);

      if (existing) {
        return current.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                qty: Math.min(item.qty + 1, Number(product.stock)),
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          cartKey,
          size: selection.size,
          color: selection.color,
          qty: 1,
        },
      ];
    });

    setCartOpen(true);
  }

  function increaseQty(cartKey) {
    setCart((current) =>
      current.map((item) => {
        if (item.cartKey !== cartKey) return item;

        return {
          ...item,
          qty: Math.min(item.qty + 1, Number(item.stock)),
        };
      })
    );
  }

  function decreaseQty(cartKey) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.cartKey !== cartKey) return item;
          return { ...item, qty: item.qty - 1 };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function removeFromCart(cartKey) {
    setCart((current) => current.filter((item) => item.cartKey !== cartKey));
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
    if (selectedCategory === "Todos") return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  function stockLabel(stock) {
    const s = Number(stock);
    if (s === 0) return "❌ Agotado";
    if (s <= 4) return `⚠️ Stock bajo: ${s}`;
    return `Stock: ${s}`;
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
  .map(
    (item) =>
      `- ${item.name} | Talla: ${item.size} | Color: ${item.color} | x${item.qty} = ₡${item.subtotal}`
  )
  .join("\n")}`
    );
  }

  function renderProductCard(product) {
    const selection = getProductSelection(product.id);

    return (
      <article className="product-card" key={product.id}>
        <div className="product-image-wrap">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="product-body">
          <p className="product-category">{product.category}</p>
          <h4>{product.name}</h4>

          <div className="product-row">
            <span className="price">₡{product.price}</span>
            <span className="stock">{stockLabel(product.stock)}</span>
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
            <div className="field">
              <label>Talla</label>
              <select
                value={selection.size}
                onChange={(e) =>
                  handleProductSelectionChange(product.id, "size", e.target.value)
                }
              >
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Color</label>
              <select
                value={selection.color}
                onChange={(e) =>
                  handleProductSelectionChange(product.id, "color", e.target.value)
                }
              >
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
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
            <div
              style={{
                background: "#dc2626",
                color: "white",
                padding: "16px 20px",
                borderRadius: "18px",
                fontWeight: "700",
                boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
              }}
            >
              🔔 {newOrderAlert}
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
                  <div className="admin-text">
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
              products.map((product) => renderProductCard(product))
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

          <div className="product-grid" style={{ marginTop: "24px" }}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => renderProductCard(product))
            ) : (
              <div className="empty-state">
                No hay productos disponibles en esta categoría.
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
                    <label>Nombre del producto</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ej. Vestido rojo"
                    />
                  </div>

                  <div className="field">
                    <label>Precio</label>
                    <input
                      name="price"
                      type="number"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="18900"
                    />
                  </div>

                  <div className="field">
                    <label>Stock</label>
                    <input
                      name="stock"
                      type="number"
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="10"
                    />
                  </div>

                  <div className="field">
                    <label>Categoría</label>
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
                    <label>URL de imagen</label>
                    <input
                      name="image"
                      value={form.image}
                      onChange={handleChange}
                      placeholder="https://..."
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
                    <img src={product.image} alt={product.name} />
                    <div className="admin-list-info">
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
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
                <h3>Pedidos recibidos</h3>
              </div>
            </div>

            {ordersMessage ? <p className="status-message">{ordersMessage}</p> : null}

            <div className="admin-list">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <div className="admin-list-item" key={order.id}>
                    <div className="admin-list-info">
                      <strong>{order.order_number || "Sin número"}</strong>
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
                      <span>Estado actual: {order.status}</span>
                      <span>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString()
                          : ""}
                      </span>
                    </div>

                    <div className="admin-list-info">
                      <strong>Productos</strong>
                      {Array.isArray(order.items) ? (
                        order.items.map((item, index) => (
                          <span key={index}>
                            {item.name} | Talla: {item.size || "N/A"} | Color: {item.color || "N/A"} | x{item.qty} = ₡{item.subtotal}
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
                ))
              ) : (
                <div className="empty-state">
                  Aún no hay pedidos registrados.
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
                    <div className="cart-item" key={item.cartKey}>
                      <img src={item.image} alt={item.name} />
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>₡{item.price}</span>
                        <span>Talla: {item.size}</span>
                        <span>Color: {item.color}</span>
                        <span>Stock: {item.stock}</span>
                      </div>

                      <div className="cart-item-actions">
                        <div className="qty-box">
                          <button type="button" onClick={() => decreaseQty(item.cartKey)}>
                            -
                          </button>
                          <span>{item.qty}</span>
                          <button type="button" onClick={() => increaseQty(item.cartKey)}>
                            +
                          </button>
                        </div>
                        <button
                          className="remove-btn"
                          type="button"
                          onClick={() => removeFromCart(item.cartKey)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="admin-form" style={{ marginTop: "10px" }}>
                    <div className="form-grid">
                      <div className="field">
                        <label>Nombre</label>
                        <input
                          name="customerName"
                          value={checkoutData.customerName}
                          onChange={handleCheckoutChange}
                          placeholder="Tu nombre"
                        />
                      </div>

                      <div className="field">
                        <label>Celular</label>
                        <input
                          name="customerPhone"
                          value={checkoutData.customerPhone}
                          onChange={handleCheckoutChange}
                          placeholder="8888-8888"
                        />
                      </div>

                      <div className="field field-full">
                        <label>Tipo de entrega</label>
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
                          <label>Dirección de entrega</label>
                          <input
                            name="deliveryAddress"
                            value={checkoutData.deliveryAddress}
                            onChange={handleCheckoutChange}
                            placeholder="Provincia, cantón, distrito, señas exactas"
                          />
                        </div>
                      ) : null}
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
                >
                  Pagar con tarjeta
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <a
        href="https://wa.me/50670477509"
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
          <path d="M19.11 17.2c-.27-.13-1.58-.78-1.82-.87-.24-.09-.42-.13-.6.13-.18.27-.69.87-.85 1.04-.16.18-.31.2-.58.07-.27-.13-1.12-.41-2.13-1.32-.79-.7-1.32-1.56-1.47-1.82-.16-.27-.02-.41.11-.54.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.53-.44-.46-.6-.47h-.51c-.18 0-.47.07-.72.34-.24.27-.94.92-.94 2.24 0 1.32.96 2.59 1.09 2.77.13.18 1.88 2.87 4.56 4.02.64.27 1.14.43 1.53.55.64.2 1.22.17 1.68.1.51-.08 1.58-.64 1.8-1.26.22-.62.22-1.15.15-1.26-.06-.11-.24-.18-.51-.31z" />
          <path d="M16.01 3.2c-7.07 0-12.8 5.72-12.8 12.79 0 2.25.59 4.45 1.71 6.38L3.2 28.8l6.58-1.69a12.74 12.74 0 0 0 6.22 1.59h.01c7.06 0 12.79-5.73 12.79-12.8 0-3.43-1.33-6.66-3.76-9.09A12.7 12.7 0 0 0 16.01 3.2zm0 23.34h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.91 1 1.05-3.81-.25-.39a10.6 10.6 0 0 1-1.63-5.67c0-5.86 4.77-10.63 10.64-10.63 2.83 0 5.49 1.1 7.49 3.11a10.5 10.5 0 0 1 3.11 7.5c0 5.87-4.77 10.64-10.64 10.64z" />
        </svg>
      </a>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>Boutique New Hope Grecia</strong>
            <p>Moda femenina y masculina con estilo, color y elegancia.</p>
          </div>
          <div>
            <p>Grecia, Costa Rica</p>
            <p>WhatsApp y pagos reales próximamente</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
