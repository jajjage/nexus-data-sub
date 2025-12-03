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
    {
      code: 'MTN',
      name: 'MTN Nigeria',
      logo_url:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.jpg/960px-New-mtn-logo.jpg?20220217143058',
    },
    {
      code: 'AIRTEL',
      name: 'Airtel Nigeria',
      logo_url:
        'https://upload.wikimedia.org/wikipedia/commons/1/18/Airtel_logo.svg',
    },
    {
      code: 'GLO',
      name: 'Glo Nigeria',
      logo_url:
        'https://upload.wikimedia.org/wikipedia/commons/8/86/Glo_button.png',
    },
    {
      code: '9MOBILE',
      name: '9mobile Nigeria',
      logo_url:
        'https://logosandtypes.com/wp-content/uploads/2020/10/9mobile-1.svg',
    },
  ]);

  // Insert suppliers
  await knex('suppliers').insert([
    { name: 'Supplier A', slug: 'supplier-a' },
    { name: 'Supplier B', slug: 'supplier-b' },
  ]);

  // Get operator and supplier IDs
  const mtn = await knex('operators').where({ code: 'MTN' }).first();
  const airtel = await knex('operators').where({ code: 'AIRTEL' }).first();
  const glo = await knex('operators').where({ code: 'GLO' }).first();
  const mobile9 = await knex('operators').where({ code: '9MOBILE' }).first();
  const supplierA = await knex('suppliers')
    .where({ slug: 'supplier-a' })
    .first();
  const supplierB = await knex('suppliers')
    .where({ slug: 'supplier-b' })
    .first();

  // Data products for each operator (5 per operator) - with 5% cashback enabled
  const dataProducts = [
    // MTN Data Products
    {
      operator_id: mtn.id,
      product_code: 'MTN-DATA-50',
      name: 'MTN 50MB Data',
      product_type: 'data',
      denom_amount: 50,
      data_mb: 50,
      validity_days: 1,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-DATA-100',
      name: 'MTN 100MB Data',
      product_type: 'data',
      denom_amount: 100,
      data_mb: 100,
      validity_days: 1,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-DATA-500',
      name: 'MTN 500MB Data',
      product_type: 'data',
      denom_amount: 500,
      data_mb: 500,
      validity_days: 7,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-DATA-1GB',
      name: 'MTN 1GB Data',
      product_type: 'data',
      denom_amount: 1000,
      data_mb: 1024,
      validity_days: 30,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-DATA-5GB',
      name: 'MTN 5GB Data',
      product_type: 'data',
      denom_amount: 5000,
      data_mb: 5120,
      validity_days: 30,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    // Airtel Data Products
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-DATA-50',
      name: 'Airtel 50MB Data',
      product_type: 'data',
      denom_amount: 50,
      data_mb: 50,
      validity_days: 1,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-DATA-100',
      name: 'Airtel 100MB Data',
      product_type: 'data',
      denom_amount: 100,
      data_mb: 100,
      validity_days: 1,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-DATA-500',
      name: 'Airtel 500MB Data',
      product_type: 'data',
      denom_amount: 500,
      data_mb: 500,
      validity_days: 7,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-DATA-1GB',
      name: 'Airtel 1GB Data',
      product_type: 'data',
      denom_amount: 1000,
      data_mb: 1024,
      validity_days: 30,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-DATA-5GB',
      name: 'Airtel 5GB Data',
      product_type: 'data',
      denom_amount: 5000,
      data_mb: 5120,
      validity_days: 30,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    // Glo Data Products
    {
      operator_id: glo.id,
      product_code: 'GLO-DATA-50',
      name: 'Glo 50MB Data',
      product_type: 'data',
      denom_amount: 50,
      data_mb: 50,
      validity_days: 1,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-DATA-100',
      name: 'Glo 100MB Data',
      product_type: 'data',
      denom_amount: 100,
      data_mb: 100,
      validity_days: 1,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-DATA-500',
      name: 'Glo 500MB Data',
      product_type: 'data',
      denom_amount: 500,
      data_mb: 500,
      validity_days: 7,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-DATA-1GB',
      name: 'Glo 1GB Data',
      product_type: 'data',
      denom_amount: 1000,
      data_mb: 1024,
      validity_days: 30,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-DATA-5GB',
      name: 'Glo 5GB Data',
      product_type: 'data',
      denom_amount: 5000,
      data_mb: 5120,
      validity_days: 30,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    // 9mobile Data Products
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-DATA-50',
      name: '9mobile 50MB Data',
      product_type: 'data',
      denom_amount: 50,
      data_mb: 50,
      validity_days: 1,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-DATA-100',
      name: '9mobile 100MB Data',
      product_type: 'data',
      denom_amount: 100,
      data_mb: 100,
      validity_days: 1,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-DATA-500',
      name: '9mobile 500MB Data',
      product_type: 'data',
      denom_amount: 500,
      data_mb: 500,
      validity_days: 7,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-DATA-1GB',
      name: '9mobile 1GB Data',
      product_type: 'data',
      denom_amount: 1000,
      data_mb: 1024,
      validity_days: 30,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-DATA-5GB',
      name: '9mobile 5GB Data',
      product_type: 'data',
      denom_amount: 5000,
      data_mb: 5120,
      validity_days: 30,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 5.0,
    },
  ];

  // Airtime products for each operator (5 per operator) - with 2% cashback enabled
  const airtimeProducts = [
    // MTN Airtime Products
    {
      operator_id: mtn.id,
      product_code: 'MTN-AIRTIME-100',
      name: 'MTN 100 Airtime',
      product_type: 'airtime',
      denom_amount: 100,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-AIRTIME-200',
      name: 'MTN 200 Airtime',
      product_type: 'airtime',
      denom_amount: 200,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-AIRTIME-500',
      name: 'MTN 500 Airtime',
      product_type: 'airtime',
      denom_amount: 500,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-AIRTIME-1000',
      name: 'MTN 1000 Airtime',
      product_type: 'airtime',
      denom_amount: 1000,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mtn.id,
      product_code: 'MTN-AIRTIME-5000',
      name: 'MTN 5000 Airtime',
      product_type: 'airtime',
      denom_amount: 5000,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    // Airtel Airtime Products
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-AIRTIME-100',
      name: 'Airtel 100 Airtime',
      product_type: 'airtime',
      denom_amount: 100,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-AIRTIME-200',
      name: 'Airtel 200 Airtime',
      product_type: 'airtime',
      denom_amount: 200,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-AIRTIME-500',
      name: 'Airtel 500 Airtime',
      product_type: 'airtime',
      denom_amount: 500,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-AIRTIME-1000',
      name: 'Airtel 1000 Airtime',
      product_type: 'airtime',
      denom_amount: 1000,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: airtel.id,
      product_code: 'AIRTEL-AIRTIME-5000',
      name: 'Airtel 5000 Airtime',
      product_type: 'airtime',
      denom_amount: 5000,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    // Glo Airtime Products
    {
      operator_id: glo.id,
      product_code: 'GLO-AIRTIME-100',
      name: 'Glo 100 Airtime',
      product_type: 'airtime',
      denom_amount: 100,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-AIRTIME-200',
      name: 'Glo 200 Airtime',
      product_type: 'airtime',
      denom_amount: 200,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-AIRTIME-500',
      name: 'Glo 500 Airtime',
      product_type: 'airtime',
      denom_amount: 500,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-AIRTIME-1000',
      name: 'Glo 1000 Airtime',
      product_type: 'airtime',
      denom_amount: 1000,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: glo.id,
      product_code: 'GLO-AIRTIME-5000',
      name: 'Glo 5000 Airtime',
      product_type: 'airtime',
      denom_amount: 5000,
      slug: 'supplier-a',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    // 9mobile Airtime Products
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-AIRTIME-100',
      name: '9mobile 100 Airtime',
      product_type: 'airtime',
      denom_amount: 100,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-AIRTIME-200',
      name: '9mobile 200 Airtime',
      product_type: 'airtime',
      denom_amount: 200,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-AIRTIME-500',
      name: '9mobile 500 Airtime',
      product_type: 'airtime',
      denom_amount: 500,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-AIRTIME-1000',
      name: '9mobile 1000 Airtime',
      product_type: 'airtime',
      denom_amount: 1000,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
    {
      operator_id: mobile9.id,
      product_code: '9MOBILE-AIRTIME-5000',
      name: '9mobile 5000 Airtime',
      product_type: 'airtime',
      denom_amount: 5000,
      slug: 'supplier-b',
      has_cashback: true,
      cashback_percentage: 2.0,
    },
  ];

  // Insert all products
  await knex('operator_products').insert([...dataProducts, ...airtimeProducts]);

  // Get all inserted products for mapping
  const allProducts = await knex('operator_products');

  // Create supplier mappings for each product
  const mappings = allProducts.map((product, index) => ({
    supplier_id: index % 2 === 0 ? supplierA.id : supplierB.id,
    operator_product_id: product.id,
    supplier_product_code: `SUP-${product.product_code}`,
    supplier_price: Math.floor(product.denom_amount * 0.9), // 10% discount
    is_active: true,
  }));

  await knex('supplier_product_mapping').insert(mappings);

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
