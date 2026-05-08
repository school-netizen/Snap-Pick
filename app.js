//Packages -->
const express = require('express');
const app = express();
const ejs = require('ejs');
const PORT = 3000;
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const path = require('path');

//Middlewares -->
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

//Routes -->
app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());



app.get('/onsearch', (req, res) => {
    const query = req.body.query
    res.render('onsearch', { products: [], query: query });
})

//commented here to perform modification in filter pannel-->
app.post('/search', async (req, res) => {
    const query = req.body.query;
    const products = await scrapeProducts(query);
    res.render('onsearch', { products: products, query: query });
});
app.get('/Mens', async (req, res) => {
    const query = 'Mens Products';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Womens', async (req, res) => {
    const query = 'Womens Products';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Kids', async (req, res) => {
    const query = 'Kids Products';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Bags_Footwear', async (req, res) => {
    const query = 'bag and footwears';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Grocery', async (req, res) => {
    const query = 'Grocery';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Electronics', async (req, res) => {
    const query = 'Electronic';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Jwellery', async (req, res) => {
    const query = 'jwellery';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});
app.get('/Beauty', async (req, res) => {
    const query = 'beauty products';
    const products = await scrapeProducts(query);
    res.render('onsearch', { products, query: query });
});


//filter-panel route -->
app.post('/filters', async (req, res) => {
    const { range, clr, brand, rating, disc, originalQuery } = req.body;
    const mergedQuery = `${clr} ${originalQuery} under ${range} ${brand} with rating ${rating}`;
    const products = await scrapeProducts(mergedQuery);
    res.render('onsearch', { products: products, query: originalQuery });
})


//Become a seller route handling -->
app.get('/add-products', (req, res) => {
    res.render('seller');
})
app.use(express.json());


// //API with shuffle products -->

async function scrapeProducts(query) {

    //Configuration of each Platform
    const platformConfigs = [
        {
            name: 'Nykaa',
            url: 'https://www.nykaa.com/search/result/?q=',
            selectors: {
                container: '.product-list-box',
                name: '.product-name',
                price: '.post-card__content-price-offer',
                image: '.product-image img'
            }
        },
        {
            name: 'Amazon',
            url: 'https://www.amazon.in/s?k=',
            selectors: {
                container: '.s-result-item',
                name: 'h2',
                price: '.a-price',
                image: 'img'
            }
        },
        {
            name: 'Myntra',
            url: 'https://www.myntra.com/',
            selectors: {
                container: '.product-base',
                name: '.product-brand',
                price: '.product-discountedPercentage',
                image: '.img-responsive'
            }
        },
        {
            name: 'Snapdeal',
            url: 'https://www.snapdeal.com/search?keyword=',
            selectors: {
                container: '.product-tuple-listing',
                name: '.product-title',
                price: '.product-price',
                image: 'img'
            }
        },
        {
            name: 'Flipkart',
            url: 'https://www.flipkart.com/search?q=',
            selectors: {
                // Flipkart uses different classes for different product types.
                // We use comma-separated selectors to catch both Grid and List layouts.
                container: '._1AtVbE, ._75WwAk, ._4ddWXP, ._1xHGtK', 
                
                // Titles are usually in these classes
                name: '._4rR01T, .s1Q9sB, .IRpwTa, .w_U9S7', 
                
                // Prices are almost always in this class
                price: '._30jeq3, ._WHN1C', 
                
                // Images are inside the container
                image: 'img._396cs4, img._2r_T1I, img' 
            }
        }
    ];

    const browser = await puppeteer.launch({ 
        headless: "shell", // Run in background
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const scrapeTasks =platformConfigs.map( platform => scrapeOnlineProducts(browser,platform.name,platform.url,query,platform.selectors) );

    try {
        // 2. Wait for all promises to resolve in parallel
        const results = await Promise.all(scrapeTasks);

        // console.log(results)
        // 3. Flatten the array of arrays into a single list
        const products = results.flat();
        // console.log(products)
        shuffleArray(products)
        return products;
    } catch (error) {
        console.error("One or more scrapers failed:", error);
        return [];
    } finally {
        await browser.close();
    }
}

const scrapeOnlineProducts = async (browser, name, baseUrl, query, selectors) => {
    //instead of launching a new browser launch a new page
    const page = await browser.newPage();
    // console.log(selectors);
    const maxProductsPerWebsite = 8;
    try {
        await page.goto(`${baseUrl}${query}`, { timeout: 60000 });
        
        // ... scraping logic ...
        const platformProducts = await page.evaluate((selectors, maxProductsPerWebsite, name) => {
            const products = [];
            const items = document.querySelectorAll(selectors.container);
            for (let i = 0; i < items.length && i < maxProductsPerWebsite; i++) {
                const item = items[i];
                const nameElement = item.querySelector(selectors.name);
                const priceElement = item.querySelector(selectors.price);
                const imageElement = item.querySelector(selectors.image);
                if (nameElement && priceElement && imageElement) {
                    const what_name = nameElement.innerText.trim();
                    const price = priceElement.innerText.trim();
                    const image = imageElement.src.trim();
                    const url = item.querySelector('a').href.trim();
                    products.push({ what_name, price, image, url, platform: name});
                } else {
                    console.log(`${platform.name}: Missing required elements`);
                }
            }
            return products;
        },selectors, maxProductsPerWebsite, name);
        return platformProducts;
        
    } catch (error) {
        console.error(`Error during ${name} scraping:`, error);
        return [];
    }  finally {
        await page.close(); // Close the tab, not the browser
    }
};
// const scrapeOnlineProducts = async (name, url, query, selectors) => {
//     const browser = await puppeteer.launch({ headless: "shell" }); // Run in background
//     const maxProductsPerWebsite = 8;
//     try {
//         const page = await browser.newPage();
//         // Construct search URL
//         const searchUrl = `${url}${encodeURIComponent(query)}`;
        
//         await page.goto(searchUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });

//         const products = await page.evaluate((sel, platformName) => {
//             const results = [];
//             const items = document.querySelectorAll(sel.container);
            
//             for (let i = 0; i < items.length && i < maxProductsPerWebsite; i++) {
//                 const item = items[i];
//                 const nameEl = item.querySelector(sel.name);
//                 const priceEl = item.querySelector(sel.price);
//                 const imgEl = item.querySelector(sel.image);
//                 const linkEl = item.querySelector('a');

//                 if (nameEl && priceEl && imgEl) {
//                     results.push({
//                         name: nameEl.innerText.trim(),
//                         price: priceEl.innerText.trim(),
//                         image: imgEl.src,
//                         url: linkEl ? linkEl.href : '',
//                         platform: platformName
//                     });
//                 }
//             }
//             return results;
//         }, selectors, name);

//         return products;
//     } catch (error) {
//         console.error(`Error during ${name} scraping:`, error.message);
//         return [];
//     } finally {
//         await browser.close();
//     }
// };

// Shuffle array function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}



/*__________________________________________________________________________*/

(async () => {
    await app.listen(PORT);
    console.log(`Server is running on port ${PORT}`);
})();

// Data base working-->
const { ObjectId } = require('mongodb');
const { client } = require('./db'); // Import the MongoDB client

// Route to render home page with products fetched from MongoDB
app.get('/', async (req, res) => {
    try {
        // Connect to the database
        await client.connect();

        // Select the database and collection
        const db = client.db('raghav');
        const productsCollection = db.collection('products');

        // Fetch all products from the collection
        const products = await productsCollection.find().toArray();

        // Render the home page with the fetched products
        res.render('home', { products: products });
    } catch (err) {
        console.error('Failed to fetch products:', err);
        res.status(500).send('An error occurred while fetching products');
    } finally {
        // Close the database connection
        await client.close();
    }
});


//Login signup handling ->-

const bcrypt = require('bcrypt');
const usersCollection = client.db('raghav').collection('users');

const session = require('express-session');
const { log } = require('console');

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        req.session.redirectTo = req.originalUrl;
        res.redirect('/login-signup');
    }
}
app.post('/add-products', isAuthenticated, async (req, res) => {

    const { title, description, url, price, po, Country, mobile, ownerinfo } = req.body;

    try {
        // Connect to the database
        await client.connect();
        // Select the database and collection
        const db = client.db('raghav');
        const productsCollection = db.collection('products');
        // const usersCollection = db.collection('user');
        // const userId = req.session.userId;
        // console.log(userId)
        // const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        // if (!userId) {

        // }
        // Insert the product into the collection
        await productsCollection.insertOne({ name: title, description: description, price: price[0], url: url, proorg: po, Country: Country, mobilenum: mobile, ownerinfo: ownerinfo });
        res.redirect('/');
    } catch (err) {
        console.error('Failed to add product:', err);
        res.status(500).send('An error occurred while adding the product');
    } finally {
        // Close the database connection
        await client.close();
    }
});
// Login route
app.get('/login-signup', (req, res) => {
    res.render('login'); // Render your login/signup page
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/');
    });
});

// Post request on /login
app.post('/login', async (req, res) => {
    const { uname, pass } = req.body;
    try {
        await client.connect();
        const user = await usersCollection.findOne({ username: uname });
        if (user && bcrypt.compareSync(pass, user.password)) {
            // res.send('Login Successful');
            req.session.userId = user._id;
            const redirectTo = req.session.redirectTo || '/';
            delete req.session.redirectTo;
            res.redirect(redirectTo);
        } else {
            res.send('Invalid username or password');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

//Post request on /sign-up -->
app.post('/sign-up', async (req, res) => {
    const { uname, email, pass } = req.body;
    try {
        await client.connect();
        const existingUser = await usersCollection.findOne({ username: uname });
        if (existingUser) {
            res.send('Username already exists');
            return;
        }
        const hashedPassword = bcrypt.hashSync(pass, 10);
        await usersCollection.insertOne({ username: uname, email, password: hashedPassword });
        // req.session.userId = uname._id;
        // const redirectTo = req.session.redirectTo || '/';
        // delete req.session.redirectTo;
        // res.redirect(redirectTo);
        res.send('Signup Successful');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

// Product view route
app.get('/view-product/:productId', isAuthenticated, async (req, res) => {
    try {
        await client.connect();
        const productId = req.params.productId;
        const db = client.db('raghav');
        const productsCollection = db.collection('products');
        const product = await productsCollection.findOne({ _id: new ObjectId(productId) }); // Correct usage of ObjectId
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('view-product', { product });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//Profile -->
app.get('/account', isAuthenticated, async (req, res) => {
    try {
        await client.connect();
        const userId = req.session.userId;
        const db = client.db('raghav');
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).send('user not found');
        }
        res.render('profile', { user });
    } catch (error) {
        console.error(error);
    }
});

const dbName = 'raghav';
// Route to handle adding to cart
app.post('/add-to-cart/:productId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You need to log in first');
    }

    const { productId } = req.params;
    const { productName, productUrl, productPrice } = req.body;
    const db = client.db(dbName);
    const cartCollection = db.collection('cart');

    try {
        const userId = req.session.userId;
        const cart = await cartCollection.findOne({ userId });

        if (cart) {
            const productIndex = cart.products.findIndex(p => p.productId === productId);
            if (productIndex > -1) {
                cart.products[productIndex].quantity += 1;
            } else {
                cart.products.push({ productId, productName, productUrl, productPrice, quantity: 1 });
            }
            await cartCollection.updateOne({ userId }, { $set: { products: cart.products } });
        } else {
            await cartCollection.insertOne({
                userId,
                products: [{ productId, productName, productUrl, productPrice, quantity: 1 }]
            });
        }

        res.status(200).redirect('/cart');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding product to cart');
    }
});

// Route to display the cart
app.get('/cart', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You need to log in first');
    }

    const userId = req.session.userId;
    const db = client.db(dbName);
    const cartCollection = db.collection('cart');

    try {
        await client.connect();
        const cart = await cartCollection.findOne({ userId });
        res.render('cart', { cart });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving cart');
    }
});


//Purchasing routes -->
app.get('/buy-product/:productId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You need to log in first');
    }
    const db = client.db('raghav');
    const { productId } = req.params; // Access productId from req.params
    const productCollection = db.collection('products');
    try {
        // Connect to the database
        await client.connect();
        // Find the product by productId
        const product = await productCollection.findOne({ _id: new ObjectId(productId) });
        if (!product) {
            // If product is not found, return 404 error
            return res.status(404).send('Product not found');
        }
        // Render the purchase page with the product data
        res.render('purchase', { product });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving product');
    }
});





//Test program for async search:
// async function scrapeProducts(query) {
//     const maxProductsPerWebsite = 8;

//     // 1. Create an array of Promises (tasks start immediately)
//     const scrapeTasks = [
//         scrapeOnlineProducts('Nykaa', 'https://www.nykaa.com/search/result/?q=', query),
//         scrapeOnlineProducts('Amazon', 'https://www.amazon.in/s?k=', query)
//     ];

//     try {
//         // 2. Wait for all promises to resolve in parallel
//         const results = await Promise.all(scrapeTasks);

//         // 3. Flatten the array of arrays into a single list
//         const allProducts = results.flat();
        
//         return allProducts;
//     } catch (error) {
//         console.error("One or more scrapers failed:", error);
//         return [];
//     }
// }

// // Pass the browser instance INTO the function instead of launching it inside
// const scrapeOnlineProducts = async (browser, name, baseUrl, query) => {
//     const page = await browser.newPage();
//     try {
//         // Block images and CSS to speed up background scraping
//         await page.setRequestInterception(true);
//         page.on('request', (req) => {
//             if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
//                 req.abort();
//             } else {
//                 req.continue();
//             }
//         });

//         await page.goto(`${baseUrl}${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
        
//         // ... your scraping logic here ...
        
//     } finally {
//         await page.close(); // Close the tab, not the browser
//     }
// };