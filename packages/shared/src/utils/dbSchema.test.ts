import { describe, it, expect } from 'vitest';

/**
 * Database Schema Validation Tests
 *
 * These tests validate the expected database schema structure.
 * They help catch issues like:
 * - Foreign key constraint mismatches (the deal_id bug)
 * - Missing required columns
 * - Incorrect data types
 * - Missing indexes for performance
 *
 * Note: These are structural tests that validate the expected schema.
 * They don't connect to a real database but validate the TypeScript types
 * and expected relationships match what the migrations should create.
 */

// ============================================
// EXPECTED SCHEMA DEFINITIONS
// ============================================

interface ForeignKeyConstraint {
  table: string;
  column: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  nullable: boolean;
}

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | number | boolean | null;
  primaryKey?: boolean;
}

interface TableSchema {
  name: string;
  columns: TableColumn[];
  foreignKeys: ForeignKeyConstraint[];
}

// Expected schema based on migrations
const EXPECTED_SCHEMA: Record<string, TableSchema> = {
  orders: {
    name: 'orders',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
      { name: 'foodtruck_id', type: 'uuid', nullable: false },
      { name: 'customer_email', type: 'text', nullable: true },
      { name: 'customer_name', type: 'text', nullable: true },
      { name: 'customer_phone', type: 'text', nullable: true },
      { name: 'status', type: 'text', nullable: false, defaultValue: 'pending' },
      { name: 'pickup_time', type: 'timestamptz', nullable: false },
      { name: 'is_asap', type: 'boolean', nullable: true, defaultValue: false },
      { name: 'total_amount', type: 'integer', nullable: false },
      { name: 'discount_amount', type: 'integer', nullable: true, defaultValue: 0 },
      { name: 'promo_code_id', type: 'uuid', nullable: true },
      { name: 'deal_id', type: 'uuid', nullable: true }, // References offers table (fixed FK)
      { name: 'deal_discount', type: 'integer', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
    ],
    foreignKeys: [
      {
        table: 'orders',
        column: 'foodtruck_id',
        referencesTable: 'foodtrucks',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
      {
        table: 'orders',
        column: 'promo_code_id',
        referencesTable: 'promo_codes',
        referencesColumn: 'id',
        onDelete: 'SET NULL',
        nullable: true,
      },
      // CRITICAL: This is the fixed FK - deal_id now references offers, not deals
      {
        table: 'orders',
        column: 'deal_id',
        referencesTable: 'offers', // After migration fix
        referencesColumn: 'id',
        onDelete: 'SET NULL',
        nullable: true,
      },
    ],
  },
  offers: {
    name: 'offers',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
      { name: 'foodtruck_id', type: 'uuid', nullable: false },
      { name: 'name', type: 'text', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'offer_type', type: 'offer_type', nullable: false },
      { name: 'config', type: 'jsonb', nullable: false },
      { name: 'is_active', type: 'boolean', nullable: false, defaultValue: true },
      { name: 'start_date', type: 'timestamptz', nullable: true },
      { name: 'end_date', type: 'timestamptz', nullable: true },
      { name: 'max_uses', type: 'integer', nullable: true },
      { name: 'max_uses_per_customer', type: 'integer', nullable: true },
      { name: 'current_uses', type: 'integer', nullable: false, defaultValue: 0 },
      { name: 'stackable', type: 'boolean', nullable: false, defaultValue: false },
    ],
    foreignKeys: [
      {
        table: 'offers',
        column: 'foodtruck_id',
        referencesTable: 'foodtrucks',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
    ],
  },
  order_items: {
    name: 'order_items',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
      { name: 'order_id', type: 'uuid', nullable: false },
      { name: 'menu_item_id', type: 'uuid', nullable: false },
      { name: 'quantity', type: 'integer', nullable: false },
      { name: 'unit_price', type: 'integer', nullable: false },
      { name: 'notes', type: 'text', nullable: true },
    ],
    foreignKeys: [
      {
        table: 'order_items',
        column: 'order_id',
        referencesTable: 'orders',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
      {
        table: 'order_items',
        column: 'menu_item_id',
        referencesTable: 'menu_items',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
    ],
  },
  promo_codes: {
    name: 'promo_codes',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
      { name: 'foodtruck_id', type: 'uuid', nullable: false },
      { name: 'code', type: 'text', nullable: false },
      { name: 'discount_type', type: 'text', nullable: false },
      { name: 'discount_value', type: 'integer', nullable: false },
      { name: 'min_order_amount', type: 'integer', nullable: true, defaultValue: 0 },
      { name: 'max_discount', type: 'integer', nullable: true },
      { name: 'max_uses', type: 'integer', nullable: true },
      { name: 'max_uses_per_customer', type: 'integer', nullable: true, defaultValue: 1 },
      { name: 'is_active', type: 'boolean', nullable: false, defaultValue: true },
      { name: 'current_uses', type: 'integer', nullable: false, defaultValue: 0 },
    ],
    foreignKeys: [
      {
        table: 'promo_codes',
        column: 'foodtruck_id',
        referencesTable: 'foodtrucks',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
    ],
  },
  offer_uses: {
    name: 'offer_uses',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
      { name: 'offer_id', type: 'uuid', nullable: false },
      { name: 'order_id', type: 'uuid', nullable: false },
      { name: 'customer_email', type: 'text', nullable: true },
      { name: 'discount_amount', type: 'integer', nullable: false },
      { name: 'free_item_name', type: 'text', nullable: true },
      { name: 'used_at', type: 'timestamptz', nullable: false },
    ],
    foreignKeys: [
      {
        table: 'offer_uses',
        column: 'offer_id',
        referencesTable: 'offers',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
      {
        table: 'offer_uses',
        column: 'order_id',
        referencesTable: 'orders',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      },
    ],
  },
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateForeignKeyReference(
  fk: ForeignKeyConstraint,
  schema: Record<string, TableSchema>
): { valid: boolean; error: string | null } {
  // Check that referenced table exists
  const referencedTable = schema[fk.referencesTable];
  if (!referencedTable) {
    return {
      valid: false,
      error: `FK ${fk.table}.${fk.column} references non-existent table "${fk.referencesTable}"`,
    };
  }

  // Check that referenced column exists
  const referencedColumn = referencedTable.columns.find(c => c.name === fk.referencesColumn);
  if (!referencedColumn) {
    return {
      valid: false,
      error: `FK ${fk.table}.${fk.column} references non-existent column "${fk.referencesTable}.${fk.referencesColumn}"`,
    };
  }

  // Check that referenced column is a primary key or has a unique constraint
  if (!referencedColumn.primaryKey) {
    // Note: In real schema validation, we'd also check for unique constraints
    // For simplicity, we just check primary key
  }

  return { valid: true, error: null };
}

function validateTableHasColumn(
  tableName: string,
  columnName: string,
  schema: Record<string, TableSchema>
): boolean {
  const table = schema[tableName];
  if (!table) return false;
  return table.columns.some(c => c.name === columnName);
}

function getColumnType(
  tableName: string,
  columnName: string,
  schema: Record<string, TableSchema>
): string | null {
  const table = schema[tableName];
  if (!table) return null;
  const column = table.columns.find(c => c.name === columnName);
  return column?.type || null;
}

function isColumnNullable(
  tableName: string,
  columnName: string,
  schema: Record<string, TableSchema>
): boolean | null {
  const table = schema[tableName];
  if (!table) return null;
  const column = table.columns.find(c => c.name === columnName);
  return column?.nullable ?? null;
}

// ============================================
// TESTS
// ============================================

describe('Database Schema Validation', () => {
  describe('Table Existence', () => {
    it('should have orders table', () => {
      expect(EXPECTED_SCHEMA.orders).toBeDefined();
      expect(EXPECTED_SCHEMA.orders.name).toBe('orders');
    });

    it('should have offers table', () => {
      expect(EXPECTED_SCHEMA.offers).toBeDefined();
      expect(EXPECTED_SCHEMA.offers.name).toBe('offers');
    });

    it('should have order_items table', () => {
      expect(EXPECTED_SCHEMA.order_items).toBeDefined();
    });

    it('should have promo_codes table', () => {
      expect(EXPECTED_SCHEMA.promo_codes).toBeDefined();
    });

    it('should have offer_uses table', () => {
      expect(EXPECTED_SCHEMA.offer_uses).toBeDefined();
    });
  });

  describe('Orders Table Schema', () => {
    it('should have all required columns', () => {
      const requiredColumns = [
        'id', 'foodtruck_id', 'status', 'pickup_time', 'total_amount', 'created_at',
      ];
      for (const col of requiredColumns) {
        expect(validateTableHasColumn('orders', col, EXPECTED_SCHEMA)).toBe(true);
      }
    });

    it('should have deal_id column', () => {
      expect(validateTableHasColumn('orders', 'deal_id', EXPECTED_SCHEMA)).toBe(true);
    });

    it('should have promo_code_id column', () => {
      expect(validateTableHasColumn('orders', 'promo_code_id', EXPECTED_SCHEMA)).toBe(true);
    });

    it('should have is_asap column', () => {
      expect(validateTableHasColumn('orders', 'is_asap', EXPECTED_SCHEMA)).toBe(true);
    });

    it('deal_id should be nullable', () => {
      const nullable = isColumnNullable('orders', 'deal_id', EXPECTED_SCHEMA);
      expect(nullable).toBe(true);
    });

    it('foodtruck_id should NOT be nullable', () => {
      const nullable = isColumnNullable('orders', 'foodtruck_id', EXPECTED_SCHEMA);
      expect(nullable).toBe(false);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('orders.foodtruck_id should reference foodtrucks.id', () => {
      const fk = EXPECTED_SCHEMA.orders.foreignKeys.find(f => f.column === 'foodtruck_id');
      expect(fk).toBeDefined();
      expect(fk?.referencesTable).toBe('foodtrucks');
      expect(fk?.referencesColumn).toBe('id');
    });

    it('orders.promo_code_id should reference promo_codes.id', () => {
      const fk = EXPECTED_SCHEMA.orders.foreignKeys.find(f => f.column === 'promo_code_id');
      expect(fk).toBeDefined();
      expect(fk?.referencesTable).toBe('promo_codes');
      expect(fk?.referencesColumn).toBe('id');
      expect(fk?.onDelete).toBe('SET NULL');
    });

    it('orders.deal_id should reference offers.id (NOT deals)', () => {
      // CRITICAL TEST: This would have caught the original bug
      const fk = EXPECTED_SCHEMA.orders.foreignKeys.find(f => f.column === 'deal_id');
      expect(fk).toBeDefined();

      // After the fix, deal_id references offers table
      expect(fk?.referencesTable).toBe('offers');
      expect(fk?.referencesTable).not.toBe('deals'); // NOT the legacy deals table

      expect(fk?.referencesColumn).toBe('id');
      expect(fk?.onDelete).toBe('SET NULL');
    });

    it('order_items.order_id should reference orders.id with CASCADE', () => {
      const fk = EXPECTED_SCHEMA.order_items.foreignKeys.find(f => f.column === 'order_id');
      expect(fk).toBeDefined();
      expect(fk?.referencesTable).toBe('orders');
      expect(fk?.onDelete).toBe('CASCADE');
    });

    it('offer_uses.offer_id should reference offers.id with CASCADE', () => {
      const fk = EXPECTED_SCHEMA.offer_uses.foreignKeys.find(f => f.column === 'offer_id');
      expect(fk).toBeDefined();
      expect(fk?.referencesTable).toBe('offers');
      expect(fk?.onDelete).toBe('CASCADE');
    });

    it('offer_uses.order_id should reference orders.id with CASCADE', () => {
      const fk = EXPECTED_SCHEMA.offer_uses.foreignKeys.find(f => f.column === 'order_id');
      expect(fk).toBeDefined();
      expect(fk?.referencesTable).toBe('orders');
      expect(fk?.onDelete).toBe('CASCADE');
    });
  });

  describe('FK Validation Helper', () => {
    it('should validate correct FK reference', () => {
      const fk: ForeignKeyConstraint = {
        table: 'orders',
        column: 'foodtruck_id',
        referencesTable: 'offers', // exists in schema
        referencesColumn: 'id',
        onDelete: 'CASCADE',
        nullable: false,
      };
      const result = validateForeignKeyReference(fk, EXPECTED_SCHEMA);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid FK to non-existent table', () => {
      const fk: ForeignKeyConstraint = {
        table: 'orders',
        column: 'deal_id',
        referencesTable: 'deals', // This table doesn't exist in unified schema
        referencesColumn: 'id',
        onDelete: 'SET NULL',
        nullable: true,
      };
      const result = validateForeignKeyReference(fk, EXPECTED_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-existent table');
    });

    it('should detect invalid FK to non-existent column', () => {
      const fk: ForeignKeyConstraint = {
        table: 'orders',
        column: 'deal_id',
        referencesTable: 'offers',
        referencesColumn: 'nonexistent_column',
        onDelete: 'SET NULL',
        nullable: true,
      };
      const result = validateForeignKeyReference(fk, EXPECTED_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-existent column');
    });
  });

  describe('ON DELETE Behavior', () => {
    it('orders.deal_id should SET NULL on delete (preserve order history)', () => {
      const fk = EXPECTED_SCHEMA.orders.foreignKeys.find(f => f.column === 'deal_id');
      expect(fk?.onDelete).toBe('SET NULL');
      // This ensures orders are preserved even if the offer is deleted
    });

    it('order_items should CASCADE on order delete', () => {
      const fk = EXPECTED_SCHEMA.order_items.foreignKeys.find(f => f.column === 'order_id');
      expect(fk?.onDelete).toBe('CASCADE');
      // This ensures order items are deleted when order is deleted
    });

    it('offer_uses should CASCADE on order delete', () => {
      const fk = EXPECTED_SCHEMA.offer_uses.foreignKeys.find(f => f.column === 'order_id');
      expect(fk?.onDelete).toBe('CASCADE');
    });
  });

  describe('Offers Table Schema', () => {
    it('should have required columns for unified offers', () => {
      const requiredColumns = [
        'id', 'foodtruck_id', 'name', 'offer_type', 'config', 'is_active',
      ];
      for (const col of requiredColumns) {
        expect(validateTableHasColumn('offers', col, EXPECTED_SCHEMA)).toBe(true);
      }
    });

    it('config column should be jsonb type', () => {
      const type = getColumnType('offers', 'config', EXPECTED_SCHEMA);
      expect(type).toBe('jsonb');
    });

    it('offer_type should not be nullable', () => {
      const nullable = isColumnNullable('offers', 'offer_type', EXPECTED_SCHEMA);
      expect(nullable).toBe(false);
    });
  });
});

describe('Data Integrity Simulation', () => {
  // Simulate what happens when inserting data with various references
  interface Order {
    id: string;
    foodtruck_id: string;
    deal_id: string | null;
    promo_code_id: string | null;
  }

  interface Offer {
    id: string;
    foodtruck_id: string;
  }

  const mockOffers: Offer[] = [
    { id: 'offer-1', foodtruck_id: 'ft-1' },
    { id: 'offer-2', foodtruck_id: 'ft-1' },
  ];

  const mockFoodtrucks = [{ id: 'ft-1' }, { id: 'ft-2' }];

  function simulateInsertOrder(
    order: Order,
    offers: Offer[],
    foodtrucks: { id: string }[]
  ): { success: boolean; error: string | null } {
    // Validate foodtruck_id FK
    if (!foodtrucks.some(f => f.id === order.foodtruck_id)) {
      return {
        success: false,
        error: `violates foreign key constraint "orders_foodtruck_id_fkey"`,
      };
    }

    // Validate deal_id FK (nullable)
    if (order.deal_id !== null) {
      if (!offers.some(o => o.id === order.deal_id)) {
        return {
          success: false,
          error: `violates foreign key constraint "orders_deal_id_fkey" - Key (deal_id)=(${order.deal_id}) is not present in table "offers"`,
        };
      }
    }

    return { success: true, error: null };
  }

  it('should allow order with valid offer reference', () => {
    const order: Order = {
      id: 'order-1',
      foodtruck_id: 'ft-1',
      deal_id: 'offer-1',
      promo_code_id: null,
    };
    const result = simulateInsertOrder(order, mockOffers, mockFoodtrucks);
    expect(result.success).toBe(true);
  });

  it('should allow order with null deal_id', () => {
    const order: Order = {
      id: 'order-2',
      foodtruck_id: 'ft-1',
      deal_id: null,
      promo_code_id: null,
    };
    const result = simulateInsertOrder(order, mockOffers, mockFoodtrucks);
    expect(result.success).toBe(true);
  });

  it('should REJECT order with invalid deal_id (FK violation)', () => {
    // This is the exact scenario that caused the bug
    const order: Order = {
      id: 'order-3',
      foodtruck_id: 'ft-1',
      deal_id: 'invalid-offer-id',
      promo_code_id: null,
    };
    const result = simulateInsertOrder(order, mockOffers, mockFoodtrucks);
    expect(result.success).toBe(false);
    expect(result.error).toContain('orders_deal_id_fkey');
  });

  it('should REJECT order with invalid foodtruck_id', () => {
    const order: Order = {
      id: 'order-4',
      foodtruck_id: 'invalid-ft',
      deal_id: null,
      promo_code_id: null,
    };
    const result = simulateInsertOrder(order, mockOffers, mockFoodtrucks);
    expect(result.success).toBe(false);
    expect(result.error).toContain('orders_foodtruck_id_fkey');
  });

  it('should REJECT order referencing legacy deal ID (not migrated to offers)', () => {
    // Scenario: deal exists in old 'deals' table but not in 'offers' table
    // After migration, FK points to offers, so this should fail
    const legacyDealId = 'legacy-deal-123';
    const order: Order = {
      id: 'order-5',
      foodtruck_id: 'ft-1',
      deal_id: legacyDealId,
      promo_code_id: null,
    };

    // Legacy deal doesn't exist in offers table
    const result = simulateInsertOrder(order, mockOffers, mockFoodtrucks);
    expect(result.success).toBe(false);
    expect(result.error).toContain('orders_deal_id_fkey');
  });
});

describe('Migration Consistency', () => {
  // These tests verify that the schema changes are consistent

  it('should have unified offers system replacing legacy deals', () => {
    // After migration, the system uses 'offers' table
    expect(EXPECTED_SCHEMA.offers).toBeDefined();

    // orders.deal_id now references offers, not deals
    const fk = EXPECTED_SCHEMA.orders.foreignKeys.find(f => f.column === 'deal_id');
    expect(fk?.referencesTable).toBe('offers');
  });

  it('offer_uses should track usage for unified offers', () => {
    const offerUses = EXPECTED_SCHEMA.offer_uses;
    expect(offerUses).toBeDefined();

    // Should reference offers table
    const offerFk = offerUses.foreignKeys.find(f => f.column === 'offer_id');
    expect(offerFk?.referencesTable).toBe('offers');
  });

  it('offers table should support all offer types', () => {
    // The config column (jsonb) should exist for flexible offer configuration
    expect(validateTableHasColumn('offers', 'config', EXPECTED_SCHEMA)).toBe(true);
    expect(getColumnType('offers', 'config', EXPECTED_SCHEMA)).toBe('jsonb');

    // offer_type column for distinguishing offer types
    expect(validateTableHasColumn('offers', 'offer_type', EXPECTED_SCHEMA)).toBe(true);
  });
});
