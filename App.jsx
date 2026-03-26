import { useEffect, useMemo, useState } from 'react'

const seedProducts = [
  {
    id: 1,
    name: 'Vestido de Baño Tropical',
    category: 'Vestidos de baño',
    price: 18900,
    stock: 12,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    description: 'Top ventas, ideal para playa.',
    featured: true,
    sizes: ['S', 'M', 'L'],
  },
  {
    id: 2,
    name: 'Blusa Casual',
    category: 'Blusas',
    price: 12900,
    stock: 9,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    description: 'Cómoda y elegante para uso diario.',
    featured: true,
    sizes: ['M', 'L'],
  },
  {
    id: 3,
    name: 'Camisa Hombre Formal',
    category: 'Camisas',
    price: 15900,
    stock: 10,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80',
    description: 'Perfecta para ocasiones especiales.',
    featured: false,
    sizes: ['M', 'L', 'XL'],
  },
  {
    id: 4,
    name: 'Vestido Elegante',
    category: 'Vestidos',
    price: 24500,
    stock: 7,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    description: 'Diseño ideal para eventos y salidas.',
    featured: true,
    sizes: ['S', 'M'],
  },
  {
    id: 5,
    name: 'Pantalón Blanco Boutique',
    category: 'Pantalones',
    price: 17900,
    stock: 15,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    description: 'Corte moderno y cómodo.',
    featured: false,
    sizes: ['S', 'M', 'L'],
  },
  {
    id: 6,
    name: 'Sombrero Verano',
    category: 'Sombreros',
    price: 9900,
    stock: 6,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
    description: 'Ligero y fresco para días soleados.',
    featured: false,
    sizes: ['Única'],
  },
]

const categories = [
  'Todos',
  'Blusas',
  'Camisas',
  'Vestidos',
  'Pantalones',
  'Enaguas',
  'Accesorios',
  'Sombreros',
  'Vestidos de baño',
]

const emptyForm = {
  name: '',
  category: 'Blusas',
  price: '',
  stock: '',
  image: '',
  description: '',
  featured: false,
}

const demoUsers = [
  { id: 'owner', name: 'Propietario', email: 'dueno@gmail.com', role: 'Admin' },
  { id: 'employee', name: 'Empleada', email: 'empleada@gmail.com', role: 'Staff' },
  { id: 'boss', name: 'Jefa', email: 'jefa@gmail.com', role: 'Superadmin' },
]

const formatCRC = (amount) =>
  new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(amount || 0)

export default function App() {
  const [view, setView] = useState('store')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [products, setProducts] = useState(seedProducts)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const savedProducts = localStorage.getItem('bnhg_products')
    const savedUser = localStorage.getItem('bnhg_current_user')
    if (savedProducts) setProducts(JSON.parse(savedProducts))
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }, [])

  useEffect(() => {
    localStorage.setItem('bnhg_products', JSON.stringify(products))
  }, [products])

  useEffect(() => {
    if (currentUser) localStorage.setItem('bnhg_current_user', JSON.stringify(currentUser))
    else localStorage.removeItem('bnhg_current_user')
  }, [currentUser])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category
      const matchesSearch = [product.name, product.category, product.description]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, search, category])

  const featured = products.filter((p) => p.featured)
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const totalStock = products.reduce((sum, item) => sum + Number(item.stock), 0)

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item
        )
      }
      return [...current, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.id !== id ? item : { ...item, qty: item.qty + delta }))
        .filter((item) => item.qty > 0)
    )
  }

  const toggleFavorite = (id) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const handleFormChange = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSaveProduct = () => {
    if (!form.name || !form.category || !form.price || !form.stock) return
    const safeImage = form.image || 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80'

    if (editingId) {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingId
            ? {
                ...product,
                name: form.name,
                category: form.category,
                price: Number(form.price),
                stock: Number(form.stock),
                image: safeImage,
                description: form.description,
                featured: form.featured,
              }
            : product
        )
      )
    } else {
      setProducts((current) => [
        {
          id: Date.now(),
          name: form.name,
          category: form.category,
          price: Number(form.price),
          stock: Number(form.stock),
          image: safeImage,
          description: form.description,
          rating: 4.8,
          featured: form.featured,
          sizes: ['S', 'M', 'L'],
        },
        ...current,
      ])
    }
    resetForm()
  }

  const handleEditProduct = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image: product.image,
      description: product.description,
      featured: product.featured,
    })
    setView('admin')
  }

  const handleDeleteProduct = (id) => {
    setProducts((current) => current.filter((product) => product.id !== id))
    setCart((current) => current.filter((item) => item.id !== id))
    setFavorites((current) => current.filter((item) => item !== id))
    if (editingId === id) resetForm()
  }

  if (!currentUser) {
    return <LoginView onLogin={setCurrentUser} />
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <div className="eyebrow">Grecia, Costa Rica</div>
          <h1>Boutique New Hope Grecia</h1>
          <div className="muted">Sesión demo: {currentUser.name} · {currentUser.role}</div>
        </div>
        <div className="top-actions">
          <button className={view === 'store' ? 'btn btn-primary' : 'btn'} onClick={() => setView('store')}>Tienda</button>
          <button className={view === 'admin' ? 'btn btn-primary' : 'btn'} onClick={() => setView('admin')}>Administrar</button>
          <button className="btn" onClick={() => setCurrentUser(null)}>Salir</button>
        </div>
      </header>

      {view === 'store' ? (
        <>
          <section className="hero-grid container">
            <div className="hero">
              <span className="pill white">Nueva temporada</span>
              <h2>Moda online completa para Boutique New Hope Grecia</h2>
              <p>Blusas, camisas, vestidos, accesorios y vestidos de baño con experiencia de compra moderna.</p>
              <div className="hero-actions">
                <button className="btn white">Comprar ahora</button>
                <button className="btn ghost-light">Ver promociones</button>
              </div>
            </div>
            <div className="info-stack">
              <InfoCard title="Stock en tiempo real" text="Podés actualizar existencias fácilmente desde tu panel." />
              <InfoCard title="Pagos online" text="Espacio preparado para tarjeta y SINPE Móvil." />
              <InfoCard title="Cuentas de clientes" text="Base ideal para login, historial y pedidos automáticos." />
              <InfoCard title="Favoritos" text={`${favorites.length} productos marcados como favoritos en esta demo.`} />
            </div>
          </section>

          <main className="container page-content">
            <section>
              <div className="section-head">
                <div>
                  <h3>Más vendidos</h3>
                  <p className="muted">Destacá aquí lo que más vende tu boutique.</p>
                </div>
                <span className="pill">Top: vestidos de baño</span>
              </div>
              <div className="product-grid">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={addToCart} onFavorite={toggleFavorite} isFavorite={favorites.includes(product.id)} />
                ))}
              </div>
            </section>

            <section>
              <div className="section-head stacked-mobile">
                <div>
                  <h3>Catálogo completo</h3>
                  <p className="muted">Experiencia tipo tienda grande, pero administrable por vos.</p>
                </div>
                <div className="catalog-controls">
                  <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." />
                </div>
              </div>

              <div className="tabs">
                {categories.map((item) => (
                  <button key={item} className={category === item ? 'tab active' : 'tab'} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>

              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={addToCart} onFavorite={toggleFavorite} isFavorite={favorites.includes(product.id)} />
                ))}
              </div>
            </section>
          </main>

          <CartBar count={totalItems} total={totalPrice} />
          <CartDrawer cart={cart} totalPrice={totalPrice} updateQty={updateQty} />
        </>
      ) : (
        <main className="container admin-page">
          <div className="admin-banner">
            <h2>Panel de administración</h2>
            <p>Aquí podés darle mantenimiento a la tienda sin tocar código. En esta versión de Vercel sigue siendo demo, pero ya es publicable.</p>
            <div className="pill-row">
              <span className="pill primary">Usuario: {currentUser.name}</span>
              <span className="pill">Rol: {currentUser.role}</span>
              <span className="pill">Correo: {currentUser.email}</span>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard title="Productos activos" value={products.length} detail="Catálogo administrable" />
            <StatCard title="Unidades en stock" value={totalStock} detail="Inventario visible" />
            <StatCard title="Modo" value="Admin" detail="Edición directa" />
          </div>

          <div className="admin-grid">
            <section className="card">
              <div className="section-head">
                <div>
                  <h3>{editingId ? 'Editar producto' : 'Agregar producto'}</h3>
                  <p className="muted">Aquí vos misma podés darle mantenimiento a la página.</p>
                </div>
                {editingId && <button className="btn" onClick={resetForm}>Cancelar</button>}
              </div>
              <div className="form-grid">
                <div>
                  <label>Nombre del producto</label>
                  <input className="input" value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder="Ej. Vestido de baño rojo" />
                </div>
                <div className="two-cols">
                  <div>
                    <label>Categoría</label>
                    <select className="input" value={form.category} onChange={(e) => handleFormChange('category', e.target.value)}>
                      {categories.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Precio</label>
                    <input className="input" type="number" value={form.price} onChange={(e) => handleFormChange('price', e.target.value)} placeholder="18900" />
                  </div>
                </div>
                <div className="two-cols">
                  <div>
                    <label>Stock</label>
                    <input className="input" type="number" value={form.stock} onChange={(e) => handleFormChange('stock', e.target.value)} placeholder="12" />
                  </div>
                  <div>
                    <label>URL de imagen</label>
                    <input className="input" value={form.image} onChange={(e) => handleFormChange('image', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div>
                  <label>Descripción</label>
                  <textarea className="input textarea" value={form.description} onChange={(e) => handleFormChange('description', e.target.value)} placeholder="Descripción corta del producto" />
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.featured} onChange={(e) => handleFormChange('featured', e.target.checked)} />
                  Marcar como producto destacado
                </label>
                <button className="btn btn-primary full" onClick={handleSaveProduct}>{editingId ? 'Guardar cambios' : 'Agregar producto'}</button>
              </div>
            </section>

            <section className="card">
              <div className="section-head">
                <div>
                  <h3>Inventario y catálogo</h3>
                  <p className="muted">Podés editar, borrar o revisar stock desde aquí.</p>
                </div>
                <span className="pill">Mantenimiento fácil</span>
              </div>
              <div className="inventory-list">
                {products.map((product) => (
                  <div key={product.id} className="inventory-item">
                    <div className="inventory-left">
                      <img src={product.image} alt={product.name} />
                      <div>
                        <h4>{product.name}</h4>
                        <p className="muted small">{product.category}</p>
                        <div className="pill-row">
                          <span className="pill">{formatCRC(product.price)}</span>
                          <span className="pill">Stock: {product.stock}</span>
                          {product.featured && <span className="pill primary">Destacado</span>}
                        </div>
                      </div>
                    </div>
                    <div className="inventory-actions">
                      <button className="btn" onClick={() => handleEditProduct(product)}>Editar</button>
                      <button className="btn danger" onClick={() => handleDeleteProduct(product.id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  )
}

function LoginView({ onLogin }) {
  return (
    <div className="login-wrap">
      <div className="container">
        <div className="center-heading">
          <div className="eyebrow">Acceso demo</div>
          <h1>Boutique New Hope Grecia</h1>
          <p className="muted maxw">Como me dijiste que no tenés experiencia, te dejé un acceso sencillo para practicar. Elegí un perfil y entrá al sistema.</p>
        </div>
        <div className="login-grid">
          <section className="card">
            <h3>Entrar al sistema</h3>
            <p className="muted">Después podés cambiar entre Tienda y Administrar desde arriba.</p>
            <div className="user-list">
              {demoUsers.map((user) => (
                <button key={user.id} className="user-card" onClick={() => onLogin(user)}>
                  <div className="user-top">
                    <div>
                      <h4>{user.name}</h4>
                      <div className="muted small">{user.email}</div>
                    </div>
                    <span className="pill primary">{user.role}</span>
                  </div>
                  <p className="muted small">
                    {user.role === 'Superadmin' && 'Acceso total: configuración, productos y supervisión general.'}
                    {user.role === 'Admin' && 'Acceso para manejar productos, inventario y catálogo.'}
                    {user.role === 'Staff' && 'Acceso para apoyo operativo y actualización de productos.'}
                  </p>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>Cómo usarlo</h3>
            <div className="steps">
              <Step n="1" title="Elegí un perfil" text="Podés entrar como vos, tu empleada o tu esposa para familiarizarte con el panel." />
              <Step n="2" title="Entrá a Administrar" text="Ahí agregás nombre, categoría, precio, stock, foto y descripción." />
              <Step n="3" title="Guardá cambios" text="En esta demo los productos quedan guardados en este navegador aunque refresqués la página." />
              <Step n="4" title="Revisá la Tienda" text="Volvé a la vista Tienda para ver cómo lo miraría un cliente." />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, onAdd, onFavorite, isFavorite }) {
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img src={product.image} alt={product.name} className="product-image" />
        <button className={isFavorite ? 'fav active' : 'fav'} onClick={() => onFavorite(product.id)}>♥</button>
      </div>
      <div className="product-body">
        <div className="product-head">
          <div>
            <div className="muted small">{product.category}</div>
            <h4>{product.name}</h4>
          </div>
          {product.featured && <span className="pill primary">Top</span>}
        </div>
        <p className="muted small">{product.description}</p>
        <div className="muted small">★ {product.rating}</div>
        <div className="size-row">
          {product.sizes?.map((size) => <span key={size} className="pill">{size}</span>)}
        </div>
        <div className="product-footer">
          <div>
            <div className="price">{formatCRC(product.price)}</div>
            <div className="muted small">Disponibles: {product.stock}</div>
          </div>
          <button className="btn btn-primary" onClick={() => onAdd(product)}>Agregar</button>
        </div>
      </div>
    </article>
  )
}

function CartBar({ count, total }) {
  return (
    <div className="cart-bar">
      <a href="#cart" className="btn btn-primary">Carrito ({count})</a>
      <span>Total: {formatCRC(total)}</span>
    </div>
  )
}

function CartDrawer({ cart, totalPrice, updateQty }) {
  return (
    <section id="cart" className="container cart-section">
      <div className="card">
        <div className="section-head">
          <h3>Carrito de compras</h3>
          <span className="pill">Total: {formatCRC(totalPrice)}</span>
        </div>
        {cart.length === 0 ? (
          <p className="muted">No hay productos en el carrito.</p>
        ) : (
          <div className="cart-list">
            {cart.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="cart-item-main">
                  <h4>{item.name}</h4>
                  <div className="muted small">{formatCRC(item.price)}</div>
                </div>
                <div className="qty-box">
                  <button className="btn" onClick={() => updateQty(item.id, -1)}>-</button>
                  <span>{item.qty}</span>
                  <button className="btn" onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="checkout-actions">
          <button className="btn btn-primary">Pagar en línea</button>
          <button className="btn">Iniciar sesión / Crear cuenta</button>
        </div>
      </div>
    </section>
  )
}

function InfoCard({ title, text }) {
  return (
    <div className="card info-card">
      <h4>{title}</h4>
      <p className="muted small">{text}</p>
    </div>
  )
}

function StatCard({ title, value, detail }) {
  return (
    <div className="card stat-card">
      <div className="muted small">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="muted small">{detail}</div>
    </div>
  )
}

function Step({ n, title, text }) {
  return (
    <div className="step-card">
      <div className="step-number">{n}</div>
      <div>
        <h4>{title}</h4>
        <p className="muted small">{text}</p>
      </div>
    </div>
  )
}
