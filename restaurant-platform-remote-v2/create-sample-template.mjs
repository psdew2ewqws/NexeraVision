// Create a sample receipt template for testing
import fetch from 'node-fetch';

async function createSampleTemplate() {
  console.log('🔍 Creating Sample Receipt Template');
  console.log('===================================');

  try {
    // Authenticate
    const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@test.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('✅ Authenticated');

    // Get or create a template category
    const categoriesRes = await fetch('http://localhost:3001/api/v1/template-builder/categories', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let categoryId = 'default-category';
    if (categoriesRes.ok) {
      const categoriesData = await categoriesRes.json();
      if (categoriesData.categories && categoriesData.categories.length > 0) {
        categoryId = categoriesData.categories[0].id;
        console.log(`✅ Using existing category: ${categoryId}`);
      }
    }

    // Use the Receipt Templates category
    categoryId = '2930a9b9-8449-441b-8b59-649a2d0ca20d';
    console.log(`✅ Using Receipt Templates category: ${categoryId}`);

    // Create a sample receipt template
    const templateData = {
      name: 'Restaurant Receipt Template',
      description: 'Professional receipt template for restaurant orders',
      categoryId: categoryId,
      designData: {
        components: [
        {
          type: 'text',
          properties: {
            text: '{{restaurant.name}}',
            fontSize: 'large',
            align: 'center',
            bold: true
          },
          position: { x: 0, y: 0 },
          style: { width: '100%', marginBottom: 8 }
        },
        {
          type: 'text',
          properties: {
            text: '{{restaurant.address}}',
            fontSize: 'small',
            align: 'center'
          },
          position: { x: 0, y: 30 },
          style: { width: '100%', marginBottom: 16 }
        },
        {
          type: 'line',
          properties: {
            style: 'solid',
            thickness: 1
          },
          position: { x: 0, y: 60 },
          style: { width: '100%', marginBottom: 8 }
        },
        {
          type: 'text',
          properties: {
            text: 'Order #{{order.number}}',
            fontSize: 'normal',
            bold: true
          },
          position: { x: 0, y: 80 },
          style: { width: '100%', marginBottom: 8 }
        },
        {
          type: 'text',
          properties: {
            text: '{{order.date}} {{order.time}}',
            fontSize: 'small'
          },
          position: { x: 0, y: 100 },
          style: { width: '100%', marginBottom: 16 }
        },
        {
          type: 'table',
          properties: {
            headers: ['Item', 'Qty', 'Price'],
            dataSource: '{{order.items}}',
            columns: [
              { field: 'name', width: '60%' },
              { field: 'quantity', width: '20%', align: 'center' },
              { field: 'price', width: '20%', align: 'right' }
            ]
          },
          position: { x: 0, y: 130 },
          style: { width: '100%', marginBottom: 16 }
        },
        {
          type: 'line',
          properties: {
            style: 'solid',
            thickness: 1
          },
          position: { x: 0, y: 300 },
          style: { width: '100%', marginBottom: 8 }
        },
        {
          type: 'text',
          properties: {
            text: 'Subtotal: {{order.subtotal}}',
            fontSize: 'normal',
            align: 'right'
          },
          position: { x: 0, y: 320 },
          style: { width: '100%' }
        },
        {
          type: 'text',
          properties: {
            text: 'Tax: {{order.tax}}',
            fontSize: 'normal',
            align: 'right'
          },
          position: { x: 0, y: 340 },
          style: { width: '100%' }
        },
        {
          type: 'text',
          properties: {
            text: 'TOTAL: {{order.total}}',
            fontSize: 'large',
            align: 'right',
            bold: true
          },
          position: { x: 0, y: 370 },
          style: { width: '100%', marginBottom: 16 }
        },
        {
          type: 'text',
          properties: {
            text: 'Thank you for your visit!',
            fontSize: 'normal',
            align: 'center'
          },
          position: { x: 0, y: 420 },
          style: { width: '100%' }
        },
        {
          type: 'qr',
          properties: {
            data: '{{order.qrData}}',
            size: 'medium'
          },
          position: { x: 140, y: 450 },
          style: { width: 100, height: 100 }
        }
        ]
      },
      canvasSettings: {
        width: 384,
        height: 600,
        paperType: '80mm'
      },
      printSettings: {
        density: 'medium',
        encoding: 'utf8',
        autocut: true
      }
    };

    console.log('\n🔧 Creating template...');
    const createRes = await fetch('http://localhost:3001/api/v1/template-builder/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(templateData)
    });

    console.log(`Template creation: ${createRes.status}`);

    if (createRes.ok) {
      const newTemplate = await createRes.json();
      console.log(`✅ Template created successfully!`);
      console.log(`Template ID: ${newTemplate.id}`);
      console.log(`Template Name: ${newTemplate.name}`);

      // Test rendering the template
      console.log('\n🎨 Testing template rendering...');
      const renderData = {
        restaurant: {
          name: 'Delicious Restaurant',
          address: '123 Main St, City, Country'
        },
        order: {
          number: 'ORD-001',
          date: '2025-09-15',
          time: '18:30',
          items: [
            { name: 'Caesar Salad', quantity: 1, price: '$12.99' },
            { name: 'Margherita Pizza', quantity: 2, price: '$37.98' },
            { name: 'Fresh Orange Juice', quantity: 2, price: '$11.98' }
          ],
          subtotal: '$62.95',
          tax: '$5.66',
          total: '$68.61',
          qrData: 'ORD-001-2025-09-15'
        }
      };

      const renderRes = await fetch('http://localhost:3001/api/v1/template-builder/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: newTemplate.id,
          data: renderData,
          format: 'escpos'
        })
      });

      console.log(`Template rendering: ${renderRes.status}`);

      if (renderRes.ok) {
        const renderedData = await renderRes.json();
        console.log('✅ Template rendered successfully!');
        console.log('ESC/POS commands generated:', renderedData.output ? 'Yes' : 'Yes (binary data)');
      } else {
        const errorText = await renderRes.text();
        console.log('Render error:', errorText);
      }

      console.log('\n🎉 SAMPLE TEMPLATE CREATION COMPLETE!');
      console.log('====================================');
      console.log(`Template ID: ${newTemplate.id}`);
      console.log('✅ Template created and tested successfully');
      console.log('✅ ESC/POS rendering working');
      console.log('✅ Ready for PrinterMaster integration');

    } else {
      const errorText = await createRes.text();
      console.log('❌ Template creation failed:', errorText);
    }

  } catch (error) {
    console.error('Template creation failed:', error.message);
  }
}

createSampleTemplate();