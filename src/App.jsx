import { useEffect, useRef, useState } from "react";
import "./App.css";
import AuthPage from "./AuthPage";
import { API, authFetch, clearSession, getSession } from "./Api";

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
const emptyFilters = { category: "", language: "", publisher: "", available: "" };

// Keyword fields match the exact value, so we compare exact (case-insensitive) values
const applyFilters = (list, f) =>
  list.filter(
    (b) =>
      (!f.category || b.category?.toLowerCase() === f.category.toLowerCase()) &&
      (!f.language || b.language?.toLowerCase() === f.language.toLowerCase()) &&
      (!f.publisher || b.publisher?.toLowerCase() === f.publisher.toLowerCase()) &&
      (!f.available || String(!!b.available) === f.available)
  );

// unique, sorted values of one field (for the dropdowns)
const uniqueValues = (list, field) =>
  [...new Set(list.map((b) => b[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function BookManager({ user, onLogout }) {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [allBooks, setAllBooks] = useState([]); // used only to build the dropdown options
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchBoxRef = useRef(null);
  // normal users (role USER) can only view and search; everyone else can add, edit and delete
  const canEdit = user.role !== "USER";

  // ---------- API calls ----------
  // Loads books for a search text + filters.
  // Filters are sent to the backend as query params (category, language, publisher, available)
  // and also applied here, so the table is correct even if the backend ignores a param.
  const loadBooks = async (query = "", f = emptyFilters) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    Object.entries(f).forEach(([key, value]) => value && params.set(key, value));

    const url = params.toString() ? `${API}/search?${params}` : API;
    const res = await authFetch(url);
    setBooks(applyFilters(await res.json(), f));
  };

  const loadAllBooks = async () => {
    const res = await authFetch(API);
    setAllBooks(await res.json());
  };

  const refresh = () => {
    loadBooks(search, filters);
    loadAllBooks();
  };

  useEffect(() => {
    loadBooks();
    loadAllBooks();
  }, []);

  const changeFilter = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    loadBooks(search, next);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    loadBooks(search, emptyFilters);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  const saveBook = async (e) => {
    e.preventDefault();
    await authFetch(form.id ? `${API}/${form.id}` : API, {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    refresh();
  };

  const deleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    await authFetch(`${API}/${id}`, { method: "DELETE" });
    refresh();
  };

  // ---------- Search suggestions (like Amazon) ----------
  // While typing, wait 250ms, ask the backend for matches,
  // and build a short list of unique titles / authors.
  useEffect(() => {
    const text = search.trim();
    if (!text) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`${API}/search?query=${encodeURIComponent(text)}`);
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

  // close the dropdown when clicking outside the search box
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
    loadBooks(text, filters);
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
      <header className="header">
        <div>
          <h1>Book Management</h1>
          <p>{books.length} {books.length === 1 ? "book" : "books"} in the library</p>
        </div>
        <div className="user-box">
          <span>{user.name}{user.role ? ` (${user.role})` : ""}</span>
          <button onClick={onLogout}>Log out</button>
        </div>
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
                loadBooks("", filters);
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
                <span className="icon">🔍</span>
                <div>{renderSuggestion(s)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Filters */}
      <div className="card filters">
        <label>
          Category
          <select value={filters.category} onChange={(e) => changeFilter("category", e.target.value)}>
            <option value="">All</option>
            {uniqueValues(allBooks, "category").map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label>
          Language
          <select value={filters.language} onChange={(e) => changeFilter("language", e.target.value)}>
            <option value="">All</option>
            {uniqueValues(allBooks, "language").map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label>
          Publisher
          <select value={filters.publisher} onChange={(e) => changeFilter("publisher", e.target.value)}>
            <option value="">All</option>
            {uniqueValues(allBooks, "publisher").map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select value={filters.available} onChange={(e) => changeFilter("available", e.target.value)}>
            <option value="">All</option>
            <option value="true">Available</option>
            <option value="false">Not available</option>
          </select>
        </label>

        {hasFilters && (
          <button type="button" className="btn gray clear-filters" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* Add / edit form */}
      {canEdit && (
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
      )}

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
              {canEdit && <th>Actions</th>}
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
                {canEdit && (
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
                )}
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

// Shows the login/signup page until the user is logged in
export default function App() {
  const [session, setSession] = useState(getSession());

  const logout = () => {
    clearSession();
    setSession(null);
  };

  if (!session?.token) return <AuthPage onLogin={setSession} />;
  return <BookManager user={session} onLogout={logout} />;
}