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
    setCart((current) => [...current, { ...product, qty: 1 }]);
    setCartOpen(true);
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  return (
    <div className="site">

      {/* HEADER */}
      <header className="topbar">
        <div className="container">
          <h1>Boutique New Hope Grecia</h1>
          <button onClick={() => setCartOpen(true)}>
            Carrito ({cart.length})
          </button>
        </div>
      </header>

      {/* PRODUCTOS */}
      <div className="container product-grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <img src={p.image} alt={p.name} />
            <h4>{p.name}</h4>
            <p>₡{p.price}</p>

            <button onClick={() => addToCart(p)}>
              Agregar al carrito
            </button>
          </div>
        ))}
      </div>

      {/* CARRITO */}
      {cartOpen && (
        <div className="cart-overlay">
          <div className="cart-panel">
            <h3>Carrito</h3>

            {cart.map((item, i) => (
              <div key={i}>
                {item.name} - ₡{item.price}
              </div>
            ))}

            <h3>Total: ₡{cartTotal}</h3>

            <button onClick={() => setCartOpen(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN WHATSAPP CORRECTO */}
      <a
        href="https://wa.me/50670477509"
        target="_blank"
        rel="noreferrer"
        className="whatsapp-float"
      >
        💬
      </a>

      {/* FOOTER CORRECTO */}
      <footer className="footer">
        <div className="container">
          <strong>Boutique New Hope Grecia</strong>
          <p>Grecia, Costa Rica</p>
        </div>
      </footer>

    </div>
  );
}
