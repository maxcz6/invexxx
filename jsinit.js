document.addEventListener("DOMContentLoaded", async () => {
  const supabaseUrl = "https://ekqcllkizcpdfnbnmean.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcWNsbGtpemNwZGZuYm5tZWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1Njc5ODksImV4cCI6MjA2NTE0Mzk4OX0.4f3oyXY6cg2436L7NZn3BO3QqMFo2ehdEPdwAfQCMeQ";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  const tabla = document.getElementById("tablaInventario");

  function ofuscarID(id) {
    return id.slice(0, 4) + "..." + id.slice(-4);
  }

  async function cargarInventario() {
    const { data, error } = await supabase.from("inventario").select("*");

    if (error) {
      console.error("Error al cargar inventario:", error.message);
      return;
    }

    tabla.innerHTML = "";
    data.forEach(item => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${ofuscarID(item.id)}</td>
        <td>${item.producto}</td>
        <td>${item.stock}</td>
        <td>${item.categoria}</td>
        <td>S/. ${item.precio_unit?.toFixed(2) || "0.00"}</td>
        <td>S/. ${item.valor_total?.toFixed(2) || "0.00"}</td>
        <td>
          <button onclick="editarProducto('${item.id}')">✏️</button>
          <button onclick="eliminarProducto('${item.id}')">🗑️</button>
        </td>
      `;
      tabla.appendChild(fila);
    });
  }

  document.getElementById("formAgregar").addEventListener("submit", async function (e) {
    e.preventDefault();

    const producto = document.getElementById("producto").value.trim();
    const stock = parseInt(document.getElementById("stock").value);
    const categoria = document.getElementById("categoria").value.trim();
    const precio_unit = parseFloat(document.getElementById("precio_unit").value);
    const valor_total = stock * precio_unit;

    if (producto && categoria && stock > 0 && precio_unit >= 0) {
      const { error } = await supabase.from("inventario").insert([
        {
          producto,
          stock,
          categoria,
          precio_unit,
          valor_total
        }
      ]);

      if (error) {
        alert("Error al agregar: " + error.message);
      } else {
        cargarInventario();
        this.reset();
      }
    }
  });

  document.getElementById("formEliminar").addEventListener("submit", async function (e) {
    e.preventDefault();
    const producto = document.getElementById("nombreEliminar").value.trim();

    if (producto) {
      const { error } = await supabase.from("inventario").delete().eq("producto", producto);
      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        cargarInventario();
        this.reset();
      }
    }
  });

  window.eliminarProducto = async function(id) {
    if (confirm("¿Seguro que deseas eliminar este producto?")) {
      const { error } = await supabase.from("inventario").delete().eq("id", id);
      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        cargarInventario();
      }
    }
  };

  window.editarProducto = async function(id) {
    const { data, error } = await supabase.from("inventario").select("*").eq("id", id).single();
    if (error) {
      alert("Error al obtener el producto: " + error.message);
      return;
    }

    // Rellenar el formulario con los datos
    document.getElementById("producto").value = data.producto;
    document.getElementById("stock").value = data.stock;
    document.getElementById("categoria").value = data.categoria;
    document.getElementById("precio_unit").value = data.precio_unit;

    // Cambiar botón de agregar a actualizar temporalmente
    const boton = document.querySelector("#formAgregar button");
    boton.textContent = "Actualizar";

    // Evitar múltiples listeners
    const form = document.getElementById("formAgregar");
    const nuevoForm = form.cloneNode(true);
    form.parentNode.replaceChild(nuevoForm, form);

    nuevoForm.addEventListener("submit", async function(e) {
      e.preventDefault();

      const producto = document.getElementById("producto").value.trim();
      const stock = parseInt(document.getElementById("stock").value);
      const categoria = document.getElementById("categoria").value.trim();
      const precio_unit = parseFloat(document.getElementById("precio_unit").value);
      const valor_total = stock * precio_unit;

      const { error } = await supabase.from("inventario").update({
        producto, stock, categoria, precio_unit, valor_total
      }).eq("id", id);

      if (error) {
        alert("Error al actualizar: " + error.message);
      } else {
        cargarInventario();
        nuevoForm.reset();
        boton.textContent = "Agregar";
      }
    });
  };

  cargarInventario();
});
