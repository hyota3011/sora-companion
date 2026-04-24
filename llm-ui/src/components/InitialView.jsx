/**
 * Displays the initial empty state of the chat with a greeting.
 * 
 * @param {Object} props - The component props.
 * @param {string} props.greeting - The greeting text to display.
 */
export default function InitialView({ greeting }) {
    return (
        <div className="initial-view">
            <h1 className="greeting">{greeting}</h1>
        </div>
    );
}
