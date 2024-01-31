const puppeteer = require('puppeteer');
const fs = require ('fs');

(async () => {
  try {
    console.log('Iniciando el script...');

    const browser = await puppeteer.launch();
    console.log('Navegador lanzado con éxito.');

    const page = await browser.newPage();
    console.log('Nueva página creada.');
    
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
    // page.click('button[type="button"]') 
    // console.log('se cerro el modal', page)

    await page.goto('https://www.bniconnectglobal.com/web/secure/networkAddConnections');

    // Definir el término de búsqueda
    const terminoBusqueda = 'Software';

    // Escribir el término de búsqueda en el campo de búsqueda
    await page.type('#memberKeyword', terminoBusqueda); // Suponiendo que el campo de búsqueda está representado por un input de tipo "search"

    const inputValue = await page.$eval("#memberKeyword", input => input.value);
    console.log(`ya se escribio la busqueda, Value @input ${inputValue}`)
    // Hacer clic en el botón de búsqueda
    page.click('input[type="submit"]')

    await Promise.all([
      page.waitForSelector('input[type="submit"][value="..."]'),// Esperar a que se cargue la página después de hacer clic
      console.log('ya se hizo click en buscar')
    ]);

    await page.waitForTimeout(10000);

    // Obtener los enlaces de los resultados de la búsqueda
    const enlaces = await page.evaluate(() => {
      const links = [];
      const enlacesElements = document.querySelectorAll('a[target="_blank"]');
      console.log(`Encontrados ${enlacesElements.length} enlaces.`);


      enlacesElements.forEach((link, index) => {
        links.push(link.href);
        console.log(`Enlace ${index + 1}: ${link.href}`);
      });
     
      return links;
    });

    const enlacesFiltrados = enlaces.filter(enlace => enlace.includes('networkHome'));
    console.log('Links:', enlacesFiltrados);
    let results = []; 
    
    let collectedData = [];
    for (const enlace of enlacesFiltrados) {
      console.log("Accessing ", enlace);

      // Navigate to the page
      await page.goto(enlace, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);

      let currentURL = await page.url();
      let pageContent = await page.content()
      console.log(`Currently at: ${currentURL}`);
      // console.log(pageContent);
      // Assuming you are getting the labels on the current page
      const currentLabels = await page.$$('label');
      
      let currentLinkData = {}

      for(let label of currentLabels) {
        try{
          currentLinkData = await page.evaluate(() => {
            let labels = document.querySelectorAll(".networkhometabs label")
            let data = {};
            for(label of labels) {
              console.log(label.children[0].textContent + ": " + label.children[1].textContent) 
                data[label.children[0].textContent] = label.children[1].textContent
            }
            return data;
          });
          results.push(currentLinkData);
        } catch(innerError) {
          console.error("Could not find labels here")
        }
      }
      
      console.log("Pushing:", currentLinkData);
      collectedData.push(currentLinkData);

          // Guardar la información extraída en un archivo JSON
      fs.writeFileSync('informacion_extraida.json', JSON.stringify(collectedData, null, 2));
    
    console.log('Extracción completada. Los datos se han guardado en informacion_extraida.json.');
    }

  } catch (error) {
    console.error('Ocurrió un error durante la extracción:', error);
  }
})();