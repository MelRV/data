const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  let browser;

  try {
    console.log('Iniciando el script...');

    browser = await puppeteer.launch();
    console.log('Navegador lanzado con éxito.');

    const page = await browser.newPage();
    console.log('Nueva página creada.');

    // Ir a la página de inicio de sesión
    await page.goto('https://www.bniconnectglobal.com');
    console.log('Se encontró la URL');

    // Esperar a que la página de inicio de sesión cargue completamente
    await page.waitForSelector('input[name="username"]');
    console.log('Buscando selector');

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

    // Navegar a la página de búsqueda
    await page.goto('https://www.bniconnectglobal.com/web/secure/networkAddConnections');

    // Esperar a que el campo de búsqueda esté presente en la página
    await page.waitForSelector('#memberKeyword', { visible: true, timeout: 10000 })
      .catch(() => console.error('No se encontró el campo de búsqueda en el tiempo especificado.'));

    // Definir el término de búsqueda
    const searchTerm = 'Software';

    // Escribir el término de búsqueda en el campo de búsqueda
    await page.type('#memberKeyword', searchTerm);

    // Hacer clic en el botón de búsqueda
    await Promise.all([
      page.waitForSelector('input[type="submit"][value="..."]', { visible: true, timeout: 10000 }),
      page.click('input[type="submit"]')
    ]);

    // Esperar a que los resultados de la búsqueda se carguen
    await page.waitForTimeout(10000);

    let collectedData = new Set();  // Use a Set to store unique profiles

    // Loop para paginación
    while (true) {
      // Obtener los enlaces de los resultados de la búsqueda
      const links = await page.evaluate(() => {
        const linksArray = [];
        const linksElements = document.querySelectorAll('a[target="_blank"]');
        console.log(`Encontrados ${linksElements.length} enlaces.`);

        linksElements.forEach((link, index) => {
          linksArray.push(link.href);
          console.log(`Enlace ${index + 1}: ${link.href}`);
        });

        return linksArray;
      });

      // Filtrar enlaces que contienen "networkHome"
      const filteredLinks = links.filter(link => link.includes('networkHome'));
      console.log('Enlaces Filtrados:', filteredLinks);

      // Procesar cada enlace
      for (const link of filteredLinks) {
        console.log("Accediendo a ", link);

        // Navegar a la página
        await page.goto(link, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        let currentURL = await page.url();
        let pageContent = await page.content();
        console.log(`Actualmente en: ${currentURL}`);

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
          } catch (innerError) {
            console.error("No se pudieron encontrar etiquetas aquí");
          }
        }

        console.log("Agregando a la lista:", currentLinkData);

        // Add the unique profile to the Set
        collectedData.add(JSON.stringify(currentLinkData));
      }

      // Verificar la presencia de un botón "Siguiente" o el indicador de la siguiente página
      const nextButton = await page.$('#datalist_next'); // Reemplazar con el ID de tu botón "Siguiente"

      if (nextButton) {
        // Hacer clic en el botón "Siguiente" para navegar a la siguiente página
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }), // Esperar a que se cargue la nueva página
          nextButton.click()
        ]);

        // Esperar a que la siguiente página se cargue (puede ser necesario ajustar este tiempo de espera)
        await page.waitForTimeout(5000); // Ajustar el tiempo de espera según sea necesario
      } else {
        // Si no hay un botón "Siguiente", salir del bucle
        break;
      }
    }

    // Convert Set back to an array and save the information extracted in a JSON file
    const uniqueProfiles = Array.from(collectedData).map(JSON.parse);
    fs.writeFileSync('informacion_extraida.json', JSON.stringify(uniqueProfiles, null, 2));

    console.log('Extracción completada. Los datos se han guardado en informacion_extraida.json.');

  } catch (error) {
    console.error('Ocurrió un error durante la extracción:', error);
  } finally {
    // Cerrar el navegador al finalizar
    if (browser) {
      await browser.close();
    }
  }
})();


