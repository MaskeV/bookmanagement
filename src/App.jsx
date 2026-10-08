import { useEffect, useState } from "react";

const API = "http://localhost:8080/api/books";
const fields = ["title", "author", "category", "publisher", "publicationYear", "language", "quantity", "description"];
const rowStyle = { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 };

export default function App() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ available: true });
  const [search, setSearch] = useState("");

  const loadBooks = async (query = "") => {
    const url = query ? `${API}/search?query=${query}` : API;
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
    setForm({ available: true });
    loadBooks(search);
  };

  const deleteBook = async (id) => {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadBooks(search);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h1>Book Management</h1>

      <form onSubmit={saveBook} style={rowStyle}>
        {fields.map((field) => (
          <input
            key={field}
            placeholder={field}
            value={form[field] ?? ""}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          />
        ))}
        <button>{form.id ? "Update" : "Add"}</button>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); loadBooks(search); }} style={rowStyle}>
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button>Search</button>
        <button type="button" onClick={() => { setSearch(""); loadBooks(); }}>Clear</button>
      </form>

      <table border="1" cellPadding="6" style={{ width: "100%" }}>
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
              <td>{book.title}</td>
              <td>{book.author}</td>
              <td>{book.category}</td>
              <td>{book.publicationYear}</td>
              <td>{book.quantity}</td>
              <td>{book.available ? "Available" : "Not available"}</td>
              <td>{book.description}</td>
              <td>
                <button onClick={() => setForm(book)}>Edit</button>{" "}
                <button onClick={() => deleteBook(book.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}