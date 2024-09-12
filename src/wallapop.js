const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

async function example() {
  const chromeOptions = new chrome.Options();

  chromeOptions.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  chromeOptions.addArguments("--disable-search-engine-choice-screen");
  chromeOptions.setUserPreferences({
    profile: {
      default_content_settings: {
        images: 2
      },
      managed_default_content_settings: {
        images: 2
      }
    }
  });

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

  try {
    // URL proporcionada
    let url = `https://es.wallapop.com/app/search?object_type_ids=10125&category_ids=12467&filters_source=quick_filters&latitude=39.57825&longitude=2.63204&distance=100000`;
    await driver.get(url);

    await driver.executeScript("document.body.style.zoom='25%'");

    // Aceptar cookies
    await driver.wait(until.elementLocated(By.id('onetrust-accept-btn-handler')), 10000);
    const acceptButton = await driver.findElement(By.id('onetrust-accept-btn-handler'));
    await acceptButton.click();
    console.log('Cookies aceptadas');

    // Esperar 1.5 segundos después de aceptar cookies y hacer clics
    await driver.sleep(1500);

    for (let i = 0; i < 3; i++) {
      // Realiza clic en las coordenadas (100, 100) de la pantalla
      await driver.actions().move({ x: 100, y: 100 }).click().perform();

      // Esperar 0.3 segundos antes de hacer el siguiente clic
      await driver.sleep(500);
    }

    // Arrays para almacenar los datos
    let adData = [];
    let adUrls = [];

    // Intentar hacer clic en el botón "Ver más productos"
    try {
      await driver.executeScript("arguments[0].scrollIntoView(true);", await driver.wait(until.elementLocated(By.css('#btn-load-more.hydrated')), 10000));
      const loadMoreButton = await driver.findElement(By.css('#btn-load-more.hydrated'));
      await loadMoreButton.click();
      console.log('Clic en "Ver más productos"');
      await driver.sleep(3000); // Esperar a que se carguen más anuncios
    } catch (err) {
      console.log('No se encontró el botón "Ver más productos".', err);
    }

    // Scroll infinito para cargar más anuncios hasta obtener al menos 100
    while (adData.length < 100) {
      // Esperar hasta que los elementos de los anuncios estén cargados
      await driver.wait(until.elementsLocated(By.css('.ItemCardList__item')), 10000);

      // Obtener todos los elementos de anuncios visibles
      let adElements = await driver.findElements(By.css('.ItemCardList__item'));

      // Recorrer todos los anuncios visibles en la página
      for (let adElement of adElements) {
        let title = await adElement.getAttribute('title');
        let url = await adElement.getAttribute('href');

        // Solo agregar si no lo hemos guardado antes
        if (!adUrls.includes(url)) {
          adData.push({ title, url });
          adUrls.push(url);

          // Si ya hemos recolectado 100 anuncios, salir del bucle
          if (adUrls.length >= 100) {
            break;
          }
        }
      }

      // Si ya hemos recolectado 100 anuncios, salir del bucle
      if (adUrls.length >= 100) {
        break;
      }

      // Desplazarse hacia abajo para cargar más anuncios
      await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
      console.log('Desplazándose hacia abajo para cargar más anuncios');

      // Esperar a que se carguen más anuncios
      await driver.sleep(3000);
    }

    // Guardar las URLs en un archivo
    saveUrlsToFile(adUrls);

    // Ahora, para cada URL, extraer los detalles y guardarlos en un archivo JSON
    await extractDetailsFromUrls(driver, adUrls);

  } catch (error) {
    console.error('Error al obtener los anuncios:', error);
  } finally {
    // Dejar abierto el navegador para inspección o cerrarlo si lo prefieres
    // await driver.quit(); 
  }
}

// Función para guardar las URLs en un archivo
function saveUrlsToFile(urls) {
  let content = urls.map((url, index) => `${index + 1}. ${url}`).join('\n');
  fs.writeFile('urls.txt', content, (err) => {
    if (err) {
      console.error('Error al guardar las URLs en el archivo:', err);
    } else {
      console.log('URLs guardadas en urls.txt');
    }
  });
}

// Función para extraer detalles de las URLs y guardarlos en un archivo JSON
async function extractDetailsFromUrls(driver, urls) {
  let allDetails = [];

  for (let url of urls) {
    await driver.get(url);

    // Inicializar los detalles con valores nulos
    let price = null;
    let title = null;
    let state = null;
    let description = null;

    try {
      // Esperar a que los elementos estén presentes
      await driver.wait(until.elementLocated(By.css('.item-detail-price_ItemDetailPrice--standard__TxPXr')), 10000);
      price = await driver.findElement(By.css('.item-detail-price_ItemDetailPrice--standard__TxPXr')).getText();
    } catch (e) {
      console.log(`No se encontró el precio para ${url}`);
    }

    try {
      title = await driver.findElement(By.css('h1.item-detail_ItemDetail__title__wcPRl.mt-2')).getText();
    } catch (e) {
      console.log(`No se encontró el título para ${url}`);
    }

    try {
      state = await driver.findElement(By.css('.item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT')).getText();
    } catch (e) {
      console.log(`No se encontró el estado para ${url}`);
    }

    try {
      description = await driver.findElement(By.css('section.item-detail_ItemDetail__description__7rXXT.py-4')).getText();
    } catch (e) {
      console.log(`No se encontró la descripción para ${url}`);
    }

    allDetails.push({
      url,
      price,
      title,
      state,
      description
    });

    console.log(`Detalles extraídos para ${url}`);
  }

  // Guardar los detalles en un archivo JSON
  fs.writeFile('details.json', JSON.stringify(allDetails, null, 2), (err) => {
    if (err) {
      console.error('Error al guardar los detalles en el archivo JSON:', err);
    } else {
      console.log('Detalles guardados en details.json');
    }
  });
}

example();
