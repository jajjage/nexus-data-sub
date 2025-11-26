import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('supplier_product_mapping').del();
  await knex('operator_products').del();
  await knex('suppliers').del();
  await knex('operators').del();
  await knex('users').del();

  // Insert operators
  await knex('operators').insert([
    { code: 'MTN', name: 'MTN Nigeria' },
    { code: 'AIRTEL', name: 'Airtel Nigeria' },
    { code: 'GLO', name: 'Glo Nigeria' },
    { code: '9MOBILE', name: '9mobile Nigeria' },
  ]);

  // Insert suppliers
  await knex('suppliers').insert([
    { name: 'Supplier A', slug: 'supplier-a' },
    { name: 'Supplier B', slug: 'supplier-b' },
  ]);

  // Get operator and supplier IDs
  const mtn = await knex('operators').where({ code: 'MTN' }).first();
  const supplierA = await knex('suppliers')
    .where({ slug: 'supplier-a' })
    .first();

  // Insert operator products
  await knex('operator_products').insert([
    {
      operator_id: mtn.id,
      product_code: 'MTN-DATA-100',
      name: 'MTN 100MB Data',
      product_type: 'data',
      denom_amount: 100,
      data_mb: 100,
      validity_days: 1,
      slug: 'supplier-a',
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-AIRTIME-100',
      name: 'MTN 100 Airtime',
      product_type: 'airtime',
      denom_amount: 100,
    },
  ]);

  // Get operator product IDs
  const mtnData100 = await knex('operator_products')
    .where({ product_code: 'MTN-DATA-100' })
    .first();

  // Insert supplier product mapping
  await knex('supplier_product_mapping').insert([
    {
      supplier_id: supplierA.id,
      operator_product_id: mtnData100.id,
      supplier_product_code: 'SUPA-MTN-100',
      supplier_price: 90,
    },
  ]);

  await knex('users').insert([
    {
      email: 'admin.test@example.com',
      full_name: 'Admin Test',
      phone_number: '07083454412',
      password: '$2a$10$DfqP4ciBvw/1PjvvUyYm6e4b694dUbRWaup/GBTtvuMljyVwLBZ86',
      role: 'admin',
    },
  ]);

  const admin = await knex('users')
    .where({ email: 'admin.test@example.com' })
    .first();
  const roleId = await knex('roles').where({ name: 'admin' }).first();
  await knex('users')
    .where({ id: admin.id })
    .update({ is_verified: true, role_id: roleId.id });
}
