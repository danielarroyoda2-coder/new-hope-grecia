import React from "react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    getProducts();
  }, []);

  async function getProducts() {
    const { data, error } = await supabase
      .from("Productos")
      .select("*");

    if (error) {
      console.error(error);
    } else {
      setProducts(data || []);
    }
  }

  return (
    <div className="site">
      <header className="topbar">
        <div className="container topbar-inner">
          <div>
            <p className="eyebrow">Grecia, Costa Rica</p>
            <h1 className="brand">Boutique New Hope Grecia</h1>
          </div>

          <nav className="nav">
            <a href="#catalogo">Catálogo</a>
            <a href="#destacados">Destacados</a>
            <a href="#admin">Administrar</a>
          </nav>
        </div>
      </header>

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
              <strong>+100</strong>
              <span>Productos listos para vender</span>
            </div>
            <div className="hero-stat">
              <strong>SINPE + Tarjeta</strong>
              <span>Pagos preparados para integrar</span>
            </div>
            <div className="hero-stat">
              <strong>Tu equipo</strong>
              <span>Vos, tu empleada y la jefa</span>
            </div>
          </div>
        </div>
      </section>

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
              products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image-wrap">
                    <img src={product.image} alt={product.name} />
                  </div>

                  <div className="product-body">
                    <p className="product-category">{product.category}</p>
                    <h4>{product.name}</h4>
                    <div className="product-row">
                      <span className="price">₡{product.price}</span>
                      <span className="stock">Stock: {product.stock}</span>
                    </div>
                    <button className="btn btn-primary full">Agregar</button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                Todavía no hay productos cargados en Supabase.
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
            {categories.map((item) => (
              <div className="category-card" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="admin">
        <div className="container">
          <div className="admin-box">
            <div>
              <p className="section-kicker">Administración</p>
              <h3>Panel listo para el siguiente paso</h3>
              <p className="admin-text">
                Esta versión ya está publicada. El siguiente paso es conectar
                productos reales, usuarios y base de datos para que puedas dar
                mantenimiento desde un panel privado.
              </p>
            </div>

            <div className="admin-actions">
              <button className="btn btn-primary">Entrar a administrar</button>
              <button className="btn btn-secondary">Conectar Supabase</button>
            </div>
          </div>
        </div>
      </section>

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
