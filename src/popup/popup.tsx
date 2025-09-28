import React from 'react';

const Popup: React.FC = () => {
    return (
        <div>
            <h1>FinSec Chrome Extension</h1>
            <p>Welcome to the FinSec Chrome Extension!</p>
            <button onClick={() => alert('Button clicked!')}>Click Me</button>
        </div>
    );
};

export default Popup;