/**
 * Singleton Pattern Implementation
 * Garantiza que una clase solo tenga una instancia y proporciona un punto de acceso global a ella
 */

class Singleton {
  constructor() {
    if (Singleton.instance) {
      return Singleton.instance;
    }

    this.data = new Map();
    this.createdAt = new Date();

    Singleton.instance = this;
    return this;
  }

  /**
   * Obtiene la instancia única del Singleton
   * @returns {Singleton} La instancia única
   */
  static getInstance() {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }

  /**
   * Establece un valor en el almacén singleton
   * @param {string} key - La clave
   * @param {any} value - El valor
   */
  set(key, value) {
    this.data.set(key, value);
  }

  /**
   * Obtiene un valor del almacén singleton
   * @param {string} key - La clave
   * @returns {any} El valor almacenado
   */
  get(key) {
    return this.data.get(key);
  }

  /**
   * Verifica si existe una clave
   * @param {string} key - La clave
   * @returns {boolean} True si existe
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * Elimina una clave del almacén
   * @param {string} key - La clave
   * @returns {boolean} True si se eliminó
   */
  delete(key) {
    return this.data.delete(key);
  }

  /**
   * Limpia todo el almacén
   */
  clear() {
    this.data.clear();
  }

  /**
   * Obtiene información de la instancia
   * @returns {object} Información de la instancia
   */
  getInfo() {
    return {
      instanceId: this.constructor.name,
      createdAt: this.createdAt,
      dataSize: this.data.size,
      keys: Array.from(this.data.keys()),
    };
  }
}

export default Singleton;
