# Mi Negocio en Orden — PWA

Aplicación para administrar clientes, presupuestos, trabajos e ingresos de trabajadores independientes.

## Características del MVP

- ✅ Instalable en el celular (PWA) desde Chrome
- ✅ Funciona offline
- ✅ Sistema de licencias con clave (pago único)
- ✅ Clientes (alta, edición, búsqueda)
- ✅ Presupuestos con ítems y estados
- ✅ Ingresos y Gastos
- ✅ Datos del negocio (configuración)
- ✅ Exportar backup en JSON
- ✅ Todo guardado localmente en el celular del usuario

## Cómo publicar en GitHub Pages (paso a paso)

### 1. Crear repositorio en GitHub

1. Entrá a [github.com](https://github.com) y creá un nuevo repositorio.
2. Nombre recomendado: `mi-negocio-en-orden`
3. Dejalo **público**.
4. No inicialices con README (ya tenemos uno).

### 2. Subir los archivos

En tu computadora:

```bash
cd mi-negocio-en-orden
git init
git add .
git commit -m "Primera versión - MVP listo para vender"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mi-negocio-en-orden.git
git push -u origin main
```

### 3. Activar GitHub Pages

1. En el repositorio → **Settings** → **Pages**
2. En **Source** elegí: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)`
4. Guardá.

En 1-2 minutos tu app estará en:

```
https://TU_USUARIO.github.io/mi-negocio-en-orden/
```

### 4. Probar la instalación

1. Abrí el link en **Chrome** del celular.
2. Debería aparecer el banner “Instalar aplicación” o “Agregar a la pantalla de inicio”.
3. Instalála.
4. Al abrirla te pide la clave de licencia.

## Cómo generar y vender licencias

1. Abrí el archivo **generador-claves.html** en tu navegador (localmente, no hace falta subirlo).
2. Generá la cantidad de claves que necesites.
3. Guardá las claves en un Excel o Notion (anotá a quién se la diste).
4. Cuando alguien te pague:
   - Mandale el link de GitHub Pages
   - Mandale una clave única
5. El cliente instala la app, pega la clave y listo.

## Estructura de archivos

```
mi-negocio-en-orden/
├── index.html              ← App principal
├── generador-claves.html   ← Solo para vos (generar claves)
├── manifest.json           ← Configuración PWA
├── sw.js                   ← Service Worker (offline)
├── css/styles.css
├── js/
│   ├── storage.js          ← Guardado local
│   ├── license.js          ← Sistema de licencias
│   └── app.js              ← Lógica de la app
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Próximas mejoras recomendadas (después de las primeras ventas)

- Generación de PDF real del presupuesto
- Fotos en trabajos
- Sincronización en la nube (Premium)
- Multi-usuario
- Recordatorios de cobro por WhatsApp

## Soporte

Cualquier duda técnica escribime.
