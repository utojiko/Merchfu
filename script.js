document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
        fetch('data/items.json').then(response => response.json()),
        fetch('data/itemTypes.json').then(response => response.json())
    ])
    .then(([itemsData, itemTypesData]) => {
        const tableBody = document.querySelector('table tbody');
        Object.keys(itemsData).forEach(key => {
            const item = itemsData[key];
            const priceKeys = Object.keys(item.price);
            const lastPriceKey = priceKeys[priceKeys.length - 1];
            const lastPrice = item.price[lastPriceKey - 1].value;
            const lastPriceDate = item.price[lastPriceKey - 1].date;

            const dateDiffInDays = (dateString) => {
                const date = new Date(dateString);
                const now = new Date();
                const diffTime = Math.abs(now - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return `${lastPrice} (${diffDays} jours)`;
            };
            const lastPriceDateDiff = dateDiffInDays(lastPriceDate);

            moyenne_prix = 0;
            priceKeys.forEach(element => {
                moyenne_prix += parseInt(parseInt(item.price[element].value.replace(/\s/g, '')));
            });
            moyenne_prix = parseInt(moyenne_prix / priceKeys.length);

            const className = moyenne_prix > 0 ? "augmentationPrix" : "diminutionPrix";
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="https://vertylo.github.io/wakassets/itemTypes/${itemTypesData[item.type]}.png" alt="${item.type}" /></td>
                <td>${key}</td>
                <td>${lastPriceDateDiff}</td>
                <td>${moyenne_prix}</td>
                <td class="${className}">${item.difference}</td>
            `;
            tableBody.appendChild(row);
        });
    })
    .catch(error => console.error('Error fetching the JSON data:', error));
});