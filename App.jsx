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

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    getProducts();
  }, []);

  async function getProducts() {
    const { data } = await supabase.from("Productos").select("*");
    setProducts(data || []);
  }

  function addToCart(product) {
    setCart((current) => {
      const exist = current.find((p) => p.id === product.id);
      if (exist) {
        return current.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  // 🔥 CREAR PEDIDO
  async function createOrder(method) {
    if (cart.length === 0) {
      alert("Carrito vacío");
      return null;
    }

    const orderNumber = "NH-" + Date.now();

    const { error } = await supabase.from("Pedidos").insert([
      {
        customer_name: "Cliente Web",
        customer_phone: "00000000",
        items: cart,
        total: cartTotal,
        payment_method: method,
        status: "pendiente",
      },
    ]);

    if (error) {
      alert("Error guardando pedido");
      return null;
    }

    // 🔥 BAJAR STOCK
    for (const item of cart) {
      await supabase
        .from("Productos")
        .update({ stock: item.stock - item.qty })
        .eq("id", item.id);
    }

    clearCart();
    setCartOpen(false);

    alert("Pedido creado correctamente ✅\nNúmero: " + orderNumber);

    return { orderNumber, total: cartTotal };
  }

  const whatsappMessage = encodeURIComponent(
    cart
      .map((i) => `${i.name} x${i.qty} ₡${i.price}`)
      .join("\n") + `\n\nTotal: ₡${cartTotal}`
  );

  return (
    <div className="site">

      {/* HEADER */}
      <header className="topbar">
        <div className="container nav-cart-wrap">
          <h1 className="brand">Boutique New Hope Grecia</h1>

          <button className="cart-button" onClick={() => setCartOpen(true)}>
            Carrito ({cart.length})
          </button>
        </div>
      </header>

      {/* PRODUCTOS */}
      <div className="container product-grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <div className="product-image-wrap">
              <img src={p.image} alt={p.name} />
            </div>

            <div className="product-body">
              <h4>{p.name}</h4>

              <div className="product-row">
                <span className="price">₡{p.price}</span>
                <span className="stock">Stock: {p.stock}</span>
              </div>

              <button
                className="btn btn-primary full"
                onClick={() => addToCart(p)}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CARRITO */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-panel" onClick={(e) => e.stopPropagation()}>

            <div className="cart-header">
              <h3>Tu carrito</h3>
              <button className="cart-close" onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-state">Tu carrito está vacío</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image} alt="" />

                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <span>₡{item.price}</span>
                      <span>Cantidad: {item.qty}</span>
                    </div>

                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Quitar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <strong>Total:</strong>
                <span>₡{cartTotal}</span>
              </div>

              <div className="cart-footer-buttons">

                <button className="btn btn-secondary" onClick={clearCart}>
                  Vaciar carrito
                </button>

                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const result = await createOrder("whatsapp");
                    if (!result) return;

                    window.open(
                      `https://wa.me/50670477509?text=${whatsappMessage}`,
                      "_blank"
                    );
                  }}
                >
                  Pedir por WhatsApp
                </button>

                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const result = await createOrder("sinpe");
                    if (!result) return;

                    alert(
                      `SINPE:

Número: 7047-7509
Monto: ₡${result.total}

Pedido: ${result.orderNumber}`
                    );
                  }}
                >
                  Pagar con SINPE
                </button>

                <button
                  className="btn btn-transfer"
                  onClick={async () => {
                    const result = await createOrder("transferencia");
                    if (!result) return;

                    alert(
                      `Transferencia:

Banco: BAC
Cuenta: 945904472
Monto: ₡${result.total}

Pedido: ${result.orderNumber}`
                    );
                  }}
                >
                  Transferencia
                </button>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* BOTÓN WHATSAPP */}
      <a
        href="https://wa.me/50670477509"
        target="_blank"
        rel="noreferrer"
        className="whatsapp-float"
      >
        💬
      </a>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <strong>Boutique New Hope Grecia</strong>
            <p>Moda femenina con estilo</p>
          </div>
          <div>
            <p>Grecia, Costa Rica</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
