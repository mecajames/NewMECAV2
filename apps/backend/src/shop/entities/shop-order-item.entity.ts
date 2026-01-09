import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ShopOrder } from './shop-order.entity';
import { ShopProduct } from './shop-product.entity';

@Entity({ tableName: 'shop_order_items', schema: 'public' })
export class ShopOrderItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => ShopOrder, { fieldName: 'order_id' })
  order!: ShopOrder;

  @ManyToOne(() => ShopProduct, { nullable: true, fieldName: 'product_id' })
  product?: ShopProduct;

  @Property({ type: 'text', fieldName: 'product_name' })
  productName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'product_sku' })
  productSku?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'unit_price' })
  unitPrice!: number;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'total_price' })
  totalPrice!: number;
}
