# API Endpoint Construction Guide

**Quick Reference for Developers**

---

## ⚠️ CRITICAL RULE

**NEVER add `/api/v1` to your endpoint paths when using `process.env.NEXT_PUBLIC_API_URL`**

The environment variable **already includes** the `/api/v1` prefix!

---

## Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
#                                        ^^^^^^^^ Already included!
```

---

## Correct Patterns

### ✅ Direct fetch() Calls

```typescript
// DO THIS
fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products`)
// Result: http://localhost:3001/api/v1/menu/products ✅

// DON'T DO THIS
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/menu/products`)
// Result: http://localhost:3001/api/v1/api/v1/menu/products ❌ 404!
```

### ✅ Service Classes with baseURL

```typescript
class ApiService {
  private baseURL = process.env.NEXT_PUBLIC_API_URL;
  // baseURL = "http://localhost:3001/api/v1"

  async get(endpoint: string) {
    // DO THIS - just pass the route path
    return fetch(`${this.baseURL}${endpoint}`);
  }
}

// Usage
const service = new ApiService();
service.get('/menu/categories'); // ✅ CORRECT
service.get('/api/v1/menu/categories'); // ❌ WRONG - doubles prefix!
```

### ✅ Axios Instance

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
  // baseURL = "http://localhost:3001/api/v1"
});

// DO THIS
api.get('/menu/products'); // ✅ CORRECT

// DON'T DO THIS
api.get('/api/v1/menu/products'); // ❌ WRONG - doubles prefix!
```

---

## Common Endpoints

| Resource | Method | Endpoint Path | Full URL |
|----------|--------|---------------|----------|
| List products | POST | `/menu/products/paginated` | `http://localhost:3001/api/v1/menu/products/paginated` |
| Get categories | GET | `/menu/categories` | `http://localhost:3001/api/v1/menu/categories` |
| Create category | POST | `/menu/categories` | `http://localhost:3001/api/v1/menu/categories` |
| Update category | PUT | `/menu/categories/:id` | `http://localhost:3001/api/v1/menu/categories/:id` |
| Delete category | DELETE | `/menu/categories/:id` | `http://localhost:3001/api/v1/menu/categories/:id` |
| Create product | POST | `/menu/products` | `http://localhost:3001/api/v1/menu/products` |
| Update product | PUT | `/menu/products/:id` | `http://localhost:3001/api/v1/menu/products/:id` |
| Upload images | POST | `/menu/products/upload-images` | `http://localhost:3001/api/v1/menu/products/upload-images` |

---

## Backend Route Mapping

**Backend Controller:**
```typescript
@Controller('menu')  // This becomes /api/v1/menu/* due to global prefix
export class MenuController {

  @Post('products/paginated')
  // Full route: /api/v1/menu/products/paginated

  @Get('categories')
  // Full route: /api/v1/menu/categories
}
```

**Backend Global Prefix (main.ts):**
```typescript
app.setGlobalPrefix('api/v1');
// All routes automatically get /api/v1 prefix
```

---

## Quick Check

Before committing, verify your API calls:

```bash
# Search for potential double prefixes
grep -r "\${process.env.NEXT_PUBLIC_API_URL}/api/v1/" src/

# Should return: 0 files
# If it finds files, you have the bug!
```

---

## Example Component

```typescript
// ✅ CORRECT EXAMPLE
export function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      // Correct - just use the endpoint path
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/menu/products/paginated`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ page: 1, limit: 50 })
        }
      );

      const data = await response.json();
      setProducts(data.products);
    };

    loadProducts();
  }, []);

  return <div>{/* render products */}</div>;
}
```

---

## Remember

- ✅ `NEXT_PUBLIC_API_URL` = `http://localhost:3001/api/v1` (complete base URL)
- ✅ Endpoint paths = `/menu/products`, `/menu/categories` (relative paths)
- ✅ Full URL = `baseURL + endpoint` = `http://localhost:3001/api/v1/menu/products`
- ❌ NEVER concatenate `/api/v1` again in your code!

---

**Last Updated:** October 2, 2025
**Status:** All endpoints verified and consistent
