export interface FileItem {
  path: string;
  name: string;
  folder: string;
  language: 'javascript' | 'json' | 'env' | 'http';
  lines: number;
  content: string;
}

export const NODE_CLASS_FILES: FileItem[] = [
  {
    path: '.env',
    name: '.env',
    folder: '',
    language: 'env',
    lines: 7,
    content: `PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ejemplo-node
DB_PORT=3306`
  },
  {
    path: 'package.json',
    name: 'package.json',
    folder: '',
    language: 'json',
    lines: 17,
    content: `{
  "name": "01-clase-crud-node",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "node --env-file=.env --watch src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "express": "^5.2.1",
    "mysql2": "^3.24.5"
  }
}`
  },
  {
    path: 'peticiones.http',
    name: 'peticiones.http',
    folder: '',
    language: 'http',
    lines: 26,
    content: `### Obtener todos los productos
GET http://localhost:3000/productos

### Obtener producto por id
GET http://localhost:3000/productos/7

### Crear un producto
POST http://localhost:3000/productos
Content-Type: application/json

{
  "nombre": "Monitor Gamer",
  "precio": 250
}

### Actualizar un producto
PUT http://localhost:3000/productos/1
Content-Type: application/json

{
  "nombre": "audifonos gamer",
  "precio": 320
}

### Eliminar un producto
DELETE http://localhost:3000/productos/1`
  },
  {
    path: 'src/config/db.js',
    name: 'db.js',
    folder: 'src/config',
    language: 'javascript',
    lines: 9,
    content: `import { createPool } from "mysql2/promise";

export const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
})`
  },
  {
    path: 'src/controllers/productos.controller.js',
    name: 'productos.controller.js',
    folder: 'src/controllers',
    language: 'javascript',
    lines: 105,
    content: `import { pool } from "../config/db.js";


// req y res van por orden posicional: req siempre es 1º y res 2º.
export const getProductos = async (req, res) => {

    try {

        const [rows] = await pool.query(
            'SELECT productos.id, productos.nombre, productos.precio, categorias.nombre AS categoria FROM productos INNER JOIN categorias ON productos.categoria_id = categorias.id'
        );
        // [rows]: filas con datos; el 2º elemento son metadatos de MySQL.
        res.json(rows);

    } catch (error) {

        res.status(500).json({ error: 'Error al obtener productos' }); // En REST siempre se responde JSON. No existe .throw en res.

    }

}

export const getProductoById = async (req, res) => {
    const { id } = req.params;


    const [rows] = await pool.query('SELECT p.id, p.nombre, p.precio, c.nombre AS categoria FROM productos p INNER JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?', [id]);
    console.log('Resultado de MySQL:', rows);


    if (rows.length === 0) {

        return res.status(404).json({ error: 'producto no encontrado' }); // return evita que Express intente responder dos veces.

    } else {

        res.status(200).json(rows[0]); // rows siempre es array en SQL. rows[0] extrae el único objeto encontrado.

    }

}

export const createProducto = async (req, res) => {
    // req.body trae los datos enviados en el JSON. No pedimos id porque MySQL lo genera con AUTO_INCREMENT.
    const { nombre, precio, categoria_id } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO productos (nombre, precio, categoria_id) VALUES (?, ?, ?)',
            [nombre, precio, categoria_id] // Los signos '?' se reemplazan en orden por los valores del array (evita inyección SQL).
        );

        // Devolvemos status 201 (Created) con el objeto recién creado incluyendo su nuevo id autogenerado.
        res.status(201).json({
            id: result.insertId,
            nombre,
            precio
        });

    } catch (error) {
        res.status(500).json({ error: 'No se pudo crear el producto' }); // En APIs se recomienda devolver un objeto JSON { error: ... }.
    }
}

export const updateProducto = async (req, res) => {

    const { nombre, precio, categoria_id } = req.body;
    const { id } = req.params; // supongo que tambien actualizará con el id?


    const [result] = await pool.query('UPDATE productos SET nombre = ?, precio = ?, categoria_id = ? WHERE id = ?', [nombre, precio, categoria_id, id])

    if (result.affectedRows === 0) {

        res.status(404).json({ error: 'no se pudo actualizar el producto' })

    } else {

        res.status(200).json({
            id: Number(id), // req.params.id viene como string. Number(id) lo devuelve como número al JSON.
            nombre,
            precio
        });

    }

}


export const deleteProducto = async (req, res) => {
    // DELETE solo necesita el id de la URL; no usa req.body.
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]) // no se cual es el query para eliminar un registro

    if (result.affectedRows === 0) {

        res.status(404).json({ error: \`no existe un producto con id: \${id}\` })

    } else {

        res.status(200).json(\`producto con id: \${id} eliminado correctamente\`);

    }
}`
  },
  {
    path: 'src/index.js',
    name: 'index.js',
    folder: 'src',
    language: 'javascript',
    lines: 26,
    content: `import express from 'express'
import { pool } from './config/db.js'
import { productosRoutes } from './routes/productos.routes.js';


const app = express();

app.use(express.json()); // Traduce el JSON del body (POST/PUT) a objeto JS. GET y DELETE no usan body.

app.use(productosRoutes);


const PORT = process.env.PORT || 3000; // El '|| 3000' es un respaldo por si falta en el .env.


app.listen(PORT, async () => { // listen(puerto, callback): solo enciende el servidor; no atiende endpoints.
    console.log(\`Servidor corriendo en el puerto \${PORT}\`);
    try {
        await pool.query('SELECT 1'); // Si falla, salta al catch y NO imprime la línea siguiente.
        console.log('Conexión a la base de datos exitosa');

    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
    }
});`
  },
  {
    path: 'src/routes/productos.routes.js',
    name: 'productos.routes.js',
    folder: 'src/routes',
    language: 'javascript',
    lines: 19,
    content: `import { Router } from "express"; // Router agrupa rutas de forma modular.
import { createProducto, getProductos, getProductoById, updateProducto, deleteProducto } from "../controllers/productos.controller.js";

const router = Router();



router.get('/productos', getProductos); // .get(ruta, funcion): cuando hagan GET a /productos, llama a getProductos.

router.get('/productos/:id', getProductoById);

router.post('/productos', createProducto); // En REST la ruta es el recurso (/productos); la acción la define el verbo (POST crea, GET lista).

router.put('/productos/:id', updateProducto);

router.delete('/productos/:id', deleteProducto);


export const productosRoutes = router; // Se exporta al final tras configurar todas las rutas.`
  }
];
