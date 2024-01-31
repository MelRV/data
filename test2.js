const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    console.log('Iniciando el script...');

    const browser = await puppeteer.launch();
    console.log('Navegador lanzado con éxito.');

    const page = await browser.newPage();
    console.log('Nueva página creada.');

    // ... (your login code remains unchanged)
     // Ir a la página de inicio de sesión
     await page.goto('https://www.bniconnectglobal.com');
     console.log('Se encontro la url');
 
 
     // Esperar a que la página de inicio de sesión cargue completamente
     await page.waitForSelector('input[name="username"]');
     console.log('buscando selector');
     // Ingresar las credenciales
     await page.type('input[name="username"]', 'alan@olinadt.com');
     await page.type('input[name="password"]', 'Al/101100');
     console.log('Inicio de sesión exitoso.');
 
     // Hacer clic en el botón de inicio de sesión
     await Promise.all([
       page.waitForNavigation(), // Esperar a que se cargue la página después de hacer clic
       page.click('button[type="submit"]') 
     ]);
 
     // Esperar a que la página principal cargue completamente después del inicio de sesión
     await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    // Go to the search results page
    await page.goto('https://www.bniconnectglobal.com/web/secure/networkAddConnections');

    // Define the search term
    const searchTerm = 'Software';

    // Write the search term in the search field
    await page.type('#memberKeyword', searchTerm);

    const inputValue = await page.$eval("#memberKeyword", input => input.value);
    console.log(`Ya se escribió la búsqueda. Valor en el input: ${inputValue}`);
    //page.click('input[type="submit"]')

    // Click the search button
    await Promise.all([
      page.waitForSelector('input[type="submit"][value="..."]'),
      page.click('input[type="submit"]')
    ]);

    // Wait for the search results to load
    await page.waitForTimeout(10000);

    const enlacesFiltrados = enlaces.filter(enlace => enlace.includes('networkHome'));
    console.log('Links:', enlacesFiltrados);
    let results = [];

    let collectedData = [];

    // Loop through the pages
    while (true) {
      // Obtain the links from the search results
      const links = await page.evaluate(() => {
        const linksArray = [];
        const linksElements = document.querySelectorAll('a[target="_blank"]');
        console.log(`Found ${linksElements.length} links.`);

        linksElements.forEach((link, index) => {
          linksArray.push(link.href);
          console.log(`Link ${index + 1}: ${link.href}`);
        });

        return linksArray;
      });

      // Filter links containing "networkHome"
      const filteredLinks = links.filter(link => link.includes('networkHome'));
      console.log('Filtered Links:', filteredLinks);

      // Process each link
      for (const link of filteredLinks) {
        console.log("Accessing ", link);

        // Navigate to the page
        await page.goto(link, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        let currentURL = await page.url();
        let pageContent = await page.content();
        console.log(`Currently at: ${currentURL}`);

        const currentLabels = await page.$$('label');

        let currentLinkData = {};

        for (let label of currentLabels) {
          try {
            currentLinkData = await page.evaluate(() => {
              let labels = document.querySelectorAll(".networkhometabs label");
              let data = {};
              for (label of labels) {
                console.log(label.children[0].textContent + ": " + label.children[1].textContent);
                data[label.children[0].textContent] = label.children[1].textContent;
              }
              return data;
            });
            collectedData.push(currentLinkData);
          } catch (innerError) {
            console.error("Could not find labels here");
          }
        }

        console.log("Pushing:", currentLinkData);
      }

      // Check for the presence of a "Next" button or another indicator of the next page
      const nextButton = await page.$('.next-button-selector'); // Replace with the selector of your "Next" button

      if (nextButton) {
        // Click the "Next" button to navigate to the next page
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }), // Wait for the new page to load
          nextButton.click()
        ]);

        // Wait for the next page to load (you might need to adjust this wait time)
        await page.waitForTimeout(5000); // Adjust the wait time as needed
      } else {
        // If there is no "Next" button, break out of the loop
        break;
      }
    }

    // Save the extracted information to a JSON file
    fs.writeFileSync('informacion_extraida.json', JSON.stringify(collectedData, null, 2));

    console.log('Extracción completada. Los datos se han guardado en informacion_extraida.json.');

  } catch (error) {
    console.error('Ocurrió un error durante la extracción:', error);
  }
})();
