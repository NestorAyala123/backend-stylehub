/**
 * Design Patterns Index
 * Exporta todos los patrones de diseño implementados
 */

// Singleton Pattern
export { default as Singleton } from './Singleton.js';

// Factory Method Pattern
export {
  Product,
  ClothingProduct,
  ElectronicsProduct,
  BookProduct,
  ProductFactory,
  ConcreteProductFactory,
  ProductFactoryManager,
} from './FactoryMethod.js';

// Repository Pattern
export {
  BaseRepository,
  DatabaseRepository,
  InMemoryRepository,
  RepositoryFactory,
} from './Repository.js';

// Strategy Pattern
export {
  Strategy,
  PaymentStrategy,
  CreditCardStrategy,
  PayPalStrategy,
  BankTransferStrategy,
  DiscountStrategy,
  PercentageDiscountStrategy,
  FixedAmountDiscountStrategy,
  BuyOneGetOneStrategy,
  StrategyContext,
  PaymentManager,
  DiscountManager,
} from './Strategy.js';

// Notification Strategy Pattern
export {
  NotificationStrategy,
  EmailNotificationStrategy,
  SMSNotificationStrategy,
  PushNotificationStrategy,
  WebhookNotificationStrategy,
  NotificationManager,
} from './NotificationManager.js';
