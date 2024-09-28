document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent page reload

    // Collect form data
    const formData = {
        salutation: document.getElementById('salutation').value,
        firstName: document.getElementById('firstName').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        role: document.getElementById('role').value
    };

    // Simple form validation
    if (!formData.username || !formData.email || !formData.role) {
        alert('Please fill out all required fields (username, email, role)');
        return;
    }

    try {
        const response = await fetch('/api/v1/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.ok) {
            const result = await response.json();
            alert('Success: ' + result.message);
        } else {
            const error = await response.json();
            alert('Error: ' + error.message); // Display specific error message from server
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('There was an error during registration. Please try again later.');
    }
});