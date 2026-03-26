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

const allowedEmails = [
  "daniel.arroyo.da2@roche.com",
  "outlethopecr@gmail.com",
  "anacatalinajimenez88@gmail.com",
];

const initialForm = {
  name: "",
  price: "",
  stock: "",
  image: "",
  category: "Vestidos",
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [session, setSession] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    getProducts();

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

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({
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

  const isAllowedUser = session && allowedEmails.includes((userEmail || "").toLowerCase());

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
              <strong>{products.length}</strong>
              <span>Productos cargados en la base de datos</span>
            </div>
            <div className="hero-stat">
              <strong>{isAllowedUser ? "Activo" : "Protegido"}</strong>
              <span>Acceso administrativo por correo</span>
            </div>
            <div className="hero-stat">
              <strong>{isAllowedUser ? userEmail : "Tu equipo"}</strong>
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
                      <span>Stock: {product.stock}</span>
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
