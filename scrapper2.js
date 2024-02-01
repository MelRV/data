const puppeteer = require('puppeteer');
const fs = require('fs');
let current_index = 0;

async function search_for(page, query = "software", siguiente_clicks = 0) {
  // Navegar a la página de búsqueda
  await page.goto('https://www.bniconnectglobal.com/web/secure/networkAddConnections');

  // Esperar a que el campo de búsqueda esté presente en la página
  await page.waitForSelector('#memberKeyword', { visible: true, timeout: 10000 })
    .catch(() => console.error('No se encontró el campo de búsqueda en el tiempo especificado.'));

  // Definir el término de búsqueda
  const searchTerm = query;

  // Escribir el término de búsqueda en el campo de búsqueda
  await page.type('#memberKeyword', searchTerm);

  // Hacer clic en el botón de búsqueda
  await Promise.all([
    page.waitForSelector('input[type="submit"][value="..."]', { visible: true, timeout: 10000 }),
    page.click('input[type="submit"]')
  ]);
  
  // Esperar a que los resultados de la búsqueda se carguen
  await page.waitForTimeout(10000);
  let selectElem = await page.$('select[name="datalist_length"]');
  await selectElem.type('100');
  await page.waitForTimeout(2000);

  if(siguiente_clicks == 0) { return true; }

  for(let i = 1; i < siguiente_clicks; i++) {
    let clicked = await page.evaluate(() => {
      let data_next_button = document.getElementById("datalist_next");
      if (data_next_button == null){
        return false;
      } else {
        data_next_button.click();
        return true;
      }
    });

    if (clicked) {
      await page.waitForTimeout(3000);
      console.log("I'm not broken good Sir 🧐 loading index:", i);
    } else {
      // not existe
      console.log("I'm broken 😢")
      return false;
    }
  }
  return true;
}
let collectedData = new Set();  // Use a Set to store unique profiles

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

    await search_for(page, "software");

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

        try {
          let currentURL = await page.url();
          let pageContent = await page.content();
          console.log(`Actualmente en: ${currentURL}`);
        } catch (error) {
          console.log("Too early error, so sad🔫")
          console.log(await page.content())
        }

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

      await search_for(page, "software", current_index++)
      const htmlContent = await page.content();
      console.log(htmlContent);

      let next_button_exists = await page.evaluate(() => {
        let data_next_button = document.getElementById("datalist_next");
        if (data_next_button == null){
          return false;
        } else {
          return true;
        }
      });
      
      if(!next_button_exists) { 
        console.log("YO! I'm dead 💀");
        break; 
      }
    }

    // Convert Set back to an array and save the information extracted in a JSON file
    const uniqueProfiles = Array.from(collectedData).map(JSON.parse);
    fs.writeFileSync('informacion_extraida.json', JSON.stringify(uniqueProfiles, null, 2));

    console.log('Extracción completada. Los datos se han guardado en informacion_extraida.json.');

  } catch (error) {
    console.error('Ocurrió un error durante la extracción:', error);
     const uniqueProfiles = Array.from(collectedData).map(JSON.parse);
    fs.writeFileSync('informacion_extraida.json', JSON.stringify(uniqueProfiles, null, 2));

  } finally {
    // Cerrar el navegador al finalizar
    if (browser) {
      await browser.close();
    }
  }
})();


