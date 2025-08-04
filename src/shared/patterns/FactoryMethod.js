/**
 * Factory Method Pattern Implementation
 * Define una interfaz para crear objetos, pero permite a las subclases decidir qué clase instanciar
 */

// Clase base abstracta para productos
class Product {
  constructor(name, price, category) {
    this.id = this.generateId();
    this.name = name;
    this.price = price;
    this.category = category;
    this.createdAt = new Date();
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      category: this.category,
      createdAt: this.createdAt,
    };
  }

  calculateTax() {
    throw new Error('calculateTax method must be implemented by subclasses');
  }
}

// Productos concretos
class ClothingProduct extends Product {
  constructor(name, price, size, material) {
    super(name, price, 'clothing');
    this.size = size;
    this.material = material;
  }

  calculateTax() {
    return this.price * 0.18; // 18% IVA para ropa
  }

  getInfo() {
    return {
      ...super.getInfo(),
      size: this.size,
      material: this.material,
      tax: this.calculateTax(),
    };
  }
}

class ElectronicsProduct extends Product {
  constructor(name, price, brand, warranty) {
    super(name, price, 'electronics');
    this.brand = brand;
    this.warranty = warranty;
  }

  calculateTax() {
    return this.price * 0.21; // 21% IVA para electrónicos
  }

  getInfo() {
    return {
      ...super.getInfo(),
      brand: this.brand,
      warranty: this.warranty,
      tax: this.calculateTax(),
    };
  }
}

class BookProduct extends Product {
  constructor(name, price, author, isbn) {
    super(name, price, 'books');
    this.author = author;
    this.isbn = isbn;
  }

  calculateTax() {
    return this.price * 0.1; // 10% IVA para libros
  }

  getInfo() {
    return {
      ...super.getInfo(),
      author: this.author,
      isbn: this.isbn,
      tax: this.calculateTax(),
    };
  }
}

// Factory abstracto
class ProductFactory {
  createProduct(type, ...args) {
    throw new Error('createProduct method must be implemented by subclasses');
  }
}

// Factory concreto
class ConcreteProductFactory extends ProductFactory {
  createProduct(type, ...args) {
    switch (type.toLowerCase()) {
      case 'clothing':
        return new ClothingProduct(...args);
      case 'electronics':
        return new ElectronicsProduct(...args);
      case 'books':
        return new BookProduct(...args);
      default:
        throw new Error(`Product type "${type}" is not supported`);
    }
  }

  getSupportedTypes() {
    return ['clothing', 'electronics', 'books'];
  }
}

// Factory manager usando Singleton
class ProductFactoryManager {
  constructor() {
    if (ProductFactoryManager.instance) {
      return ProductFactoryManager.instance;
    }

    this.factories = new Map();
    this.registerFactory('default', new ConcreteProductFactory());

    ProductFactoryManager.instance = this;
    return this;
  }

  static getInstance() {
    if (!ProductFactoryManager.instance) {
      ProductFactoryManager.instance = new ProductFactoryManager();
    }
    return ProductFactoryManager.instance;
  }

  registerFactory(name, factory) {
    if (!(factory instanceof ProductFactory)) {
      throw new Error('Factory must extend ProductFactory class');
    }
    this.factories.set(name, factory);
  }

  getFactory(name = 'default') {
    if (!this.factories.has(name)) {
      throw new Error(`Factory "${name}" not found`);
    }
    return this.factories.get(name);
  }

  createProduct(type, ...args) {
    const factory = this.getFactory();
    return factory.createProduct(type, ...args);
  }

  getAvailableFactories() {
    return Array.from(this.factories.keys());
  }
}

export {
  Product,
  ClothingProduct,
  ElectronicsProduct,
  BookProduct,
  ProductFactory,
  ConcreteProductFactory,
  ProductFactoryManager,
};
