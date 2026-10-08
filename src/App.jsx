import { useEffect, useRef, useState } from "react";

const API = "http://localhost:8080/api/books";

const fields = [
  { name: "title", label: "Title" },
  { name: "author", label: "Author" },
  { name: "category", label: "Category" },
  { name: "publisher", label: "Publisher" },
  { name: "publicationYear", label: "Year", type: "number" },
  { name: "language", label: "Language" },
  { name: "quantity", label: "Quantity", type: "number" },
  { name: "description", label: "Description", wide: true },
];

const emptyForm = { available: true };

export default function App() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchBoxRef = useRef(null);

  // ---------- API calls ----------
  const loadBooks = async (query = "") => {
    const url = query ? `${API}/search?query=${encodeURIComponent(query)}` : API;
    const res = await fetch(url);
    setBooks(await res.json());
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const saveBook = async (e) => {
    e.preventDefault();
    await fetch(form.id ? `${API}/${form.id}` : API, {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    loadBooks(search);
  };

  const deleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadBooks(search);
  };

  useEffect(() => {
    const text = search.trim();
    if (!text) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/search?query=${encodeURIComponent(text)}`);
        const data = await res.json();
        const lower = text.toLowerCase();
        const unique = new Set();

        data.forEach((b) => {
          [b.title, b.author].forEach((value) => {
            if (value && value.toLowerCase().includes(lower)) unique.add(value);
          });
        });

        if (!cancelled) {
          setSuggestions([...unique].slice(0, 8));
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

 
  useEffect(() => {
    const handleClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const runSearch = (text) => {
    setSearch(text);
    setShowSuggestions(false);
    loadBooks(text);
  };

  const handleSearchKeys = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      runSearch(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // typed part stays normal, the rest of the suggestion is bold
  const renderSuggestion = (text) => {
    const start = text.toLowerCase().indexOf(search.trim().toLowerCase());
    if (start === -1) return text;
    const end = start + search.trim().length;
    return (
      <>
        {text.slice(0, start)}
        <span>{text.slice(start, end)}</span>
        <b>{text.slice(end)}</b>
      </>
    );
  };

  // ---------- Form ----------
  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field.name]: field.type === "number" && value !== "" ? Number(value) : value,
    });
  };

  return (
    <div className="page">
      <style>{css}</style>

      <header className="header">
        <h1>Book Management</h1>
        <p>{books.length} {books.length === 1 ? "book" : "books"} in the library</p>
      </header>

      {/* Search with suggestions */}
      <div className="search" ref={searchBoxRef}>
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(search);
          }}
        >
          <input
            placeholder="Search by title, author, category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeys}
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              className="clear"
              onClick={() => {
                setSearch("");
                setSuggestions([]);
                loadBooks();
              }}
            >
              ✕
            </button>
          )}
          <button className="search-btn">Search</button>
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s, i) => (
              <li
                key={s}
                className={i === activeIndex ? "active" : ""}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => runSearch(s)}
              >
                <span className="icon"></span>
                <div>{renderSuggestion(s)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add / edit form */}
      <form className="card form" onSubmit={saveBook}>
        <h2>{form.id ? "Edit book" : "Add a new book"}</h2>
        <div className="grid">
          {fields.map((f) => (
            <label key={f.name} className={f.wide ? "wide" : ""}>
              {f.label}
              <input
                type={f.type || "text"}
                value={form[f.name] ?? ""}
                onChange={(e) => handleChange(f, e.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="form-actions">
          <label className="check">
            <input
              type="checkbox"
              checked={!!form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
            />
            Available
          </label>
          <div>
            {form.id && (
              <button type="button" className="btn gray" onClick={() => setForm(emptyForm)}>
                Cancel
              </button>
            )}
            <button className="btn primary">{form.id ? "Update book" : "Add book"}</button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Year</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book, index) => (
              <tr key={book.id}>
                <td>{index + 1}</td>
                <td className="title">{book.title}</td>
                <td>{book.author}</td>
                <td>
                  <span className="tag">{book.category}</span>
                </td>
                <td>{book.publicationYear}</td>
                <td>{book.quantity}</td>
                <td>
                  <span className={book.available ? "badge ok" : "badge no"}>
                    {book.available ? "Available" : "Not available"}
                  </span>
                </td>
                <td className="desc">{book.description}</td>
                <td className="actions">
                  <button
                    className="btn small blue"
                    onClick={() => {
                      setForm(book);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </button>
                  <button className="btn small red" onClick={() => deleteBook(book.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan="9" className="empty">
                  No books found. Add one above or try a different search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const css = `
  body { margin: 0; background: #f1f5f9; }
  .page { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; font-family: system-ui, Segoe UI, sans-serif; color: #1e293b; }

  .header { background: linear-gradient(135deg, #4338ca, #0e7490); color: #fff; padding: 24px 28px; border-radius: 14px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 28px; }
  .header p { margin: 4px 0 0; opacity: .85; }

  .card { background: #fff; border-radius: 14px; box-shadow: 0 2px 10px rgba(15, 23, 42, .07); padding: 20px; margin-bottom: 20px; }

  /* search */
  .search { position: relative; margin-bottom: 20px; }
  .search-bar { display: flex; background: #fff; border: 2px solid #f59e0b; border-radius: 10px; overflow: hidden; }
  .search-bar input { flex: 1; border: none; outline: none; padding: 12px 14px; font-size: 16px; }
  .search-btn { background: #f59e0b; border: none; padding: 0 22px; font-weight: 600; color: #1e293b; cursor: pointer; }
  .search-btn:hover { background: #d97706; color: #fff; }
  .clear { background: none; border: none; color: #94a3b8; font-size: 16px; padding: 0 12px; cursor: pointer; }
  .suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; list-style: none; margin: 4px 0 0; padding: 6px 0; background: #fff; border-radius: 10px; box-shadow: 0 8px 24px rgba(15, 23, 42, .18); }
  .suggestions li { display: flex; align-items: center; gap: 10px; padding: 9px 16px; cursor: pointer; }
  .suggestions li.active { background: #fef3c7; }
  .suggestions .icon { font-size: 13px; opacity: .5; }
  .suggestions b { font-weight: 700; }

  /* form */
  .form h2 { margin: 0 0 14px; font-size: 18px; color: #4338ca; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
  .grid label { display: flex; flex-direction: column; font-size: 13px; font-weight: 600; color: #475569; gap: 5px; }
  .grid label.wide { grid-column: 1 / -1; }
  .grid input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; font-weight: 400; color: #1e293b; }
  .grid input:focus { outline: none; border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67, 56, 202, .15); }
  .form-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .check { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #475569; }

  /* buttons */
  .btn { border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; color: #fff; margin-left: 8px; }
  .btn.primary { background: #4338ca; }
  .btn.primary:hover { background: #3730a3; }
  .btn.gray { background: #64748b; }
  .btn.small { padding: 6px 12px; font-size: 13px; margin: 0 4px 0 0; }
  .btn.blue { background: #0284c7; }
  .btn.red { background: #dc2626; }

  /* table */
  .table-wrap { padding: 0; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #4338ca; color: #fff; text-align: left; padding: 12px; font-size: 14px; white-space: nowrap; }
  td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: top; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #eef2ff; }
  td.title { font-weight: 600; }
  td.desc { max-width: 220px; color: #64748b; }
  td.actions { white-space: nowrap; }
  td.empty { text-align: center; color: #94a3b8; padding: 28px; }
  .tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .badge.ok { background: #dcfce7; color: #15803d; }
  .badge.no { background: #fee2e2; color: #b91c1c; }
`;