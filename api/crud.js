const fs = require('fs');
const path = require('path');

// Chemin vers le fichier JSON
const filePath = path.join(__dirname, '..', 'items.json');

module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { itemName, newPrice } = req.body;

        // Lire le fichier JSON
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Error reading JSON file' });
            }

            const items = JSON.parse(data);

            if (!items[itemName]) {
                return res.status(404).json({ error: `Item ${itemName} not found` });
            }

            const prices = items[itemName].price;
            const newPriceId = Object.keys(prices).length + 1;
            const currentDate = new Date().toISOString().split('T')[0];

            prices[newPriceId] = {
                date: currentDate,
                value: newPrice
            };

            // Écrire les modifications dans le fichier JSON
            fs.writeFile(filePath, JSON.stringify(items, null, 4), 'utf8', (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error writing JSON file' });
                }

                res.status(200).json({ message: `New price added for item ${itemName}: ${newPrice} on ${currentDate}` });
            });
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};