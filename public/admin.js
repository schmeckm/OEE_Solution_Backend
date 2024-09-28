document.addEventListener("DOMContentLoaded", () => {
    const configForm = document.getElementById('configForm');

    // Fetch and populate config values
    fetch('/config')
        .then(response => response.json())
        .then(data => {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const input = document.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.value = data[key];
                    }
                }
            }
        })
        .catch(error => console.error('Error fetching config:', error));

    // Handle form submission
    configForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(configForm);
        const configData = {};
        formData.forEach((value, key) => {
            configData[key] = value;
        });

        fetch('/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            })
            .then(response => response.json())
            .then(data => {
                alert('Configuration updated successfully');
            })
            .catch(error => console.error('Error updating config:', error));
    });
});