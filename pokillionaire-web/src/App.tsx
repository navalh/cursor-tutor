import { useEffect, useState } from "react";
import "@fontsource/press-start-2p";

// Types
interface Pokemon {
  id: number;
  name: string;
  sprite: string;
}

type Mode = "text" | "choice";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const GUESSED_KEY = "pokillionaire_guessed";
const MODE_KEY = "pokillionaire_mode";

// Hangman drawing SVG component
function HangmanDrawing({ incorrect }: { incorrect: number }) {
  // Each part is drawn in order: gallows, head, body, left arm, right arm, left leg, right leg
  // incorrect: 0-6
  return (
    <svg width="120" height="180" style={{ background: "#fff" }}>
      {/* Gallows */}
      <line x1="10" y1="170" x2="110" y2="170" stroke="#222" strokeWidth="4" /> {/* base */}
      <line x1="40" y1="170" x2="40" y2="20" stroke="#222" strokeWidth="4" /> {/* pole */}
      <line x1="40" y1="20" x2="90" y2="20" stroke="#222" strokeWidth="4" /> {/* top */}
      <line x1="90" y1="20" x2="90" y2="40" stroke="#222" strokeWidth="4" /> {/* rope */}
      {/* Head */}
      {incorrect > 0 && <circle cx="90" cy="55" r="15" stroke="#222" strokeWidth="4" fill="none" />} 
      {/* Body */}
      {incorrect > 1 && <line x1="90" y1="70" x2="90" y2="110" stroke="#222" strokeWidth="4" />} 
      {/* Left Arm */}
      {incorrect > 2 && <line x1="90" y1="80" x2="70" y2="100" stroke="#222" strokeWidth="4" />} 
      {/* Right Arm */}
      {incorrect > 3 && <line x1="90" y1="80" x2="110" y2="100" stroke="#222" strokeWidth="4" />} 
      {/* Left Leg */}
      {incorrect > 4 && <line x1="90" y1="110" x2="75" y2="140" stroke="#222" strokeWidth="4" />} 
      {/* Right Leg */}
      {incorrect > 5 && <line x1="90" y1="110" x2="105" y2="140" stroke="#222" strokeWidth="4" />} 
    </svg>
  );
}

function App() {
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [guessed, setGuessed] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<Mode>("text");
  const [input, setInput] = useState<string>("");
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [message, setMessage] = useState<string>("");
  const [incorrect, setIncorrect] = useState<number>(0);

  // Load all Pokémon
  useEffect(() => {
    fetch("/pokemon.json")
      .then((res) => res.json())
      .then((data) => {
        setAllPokemon(data);
        setCurrentIdx(Math.floor(Math.random() * data.length));
      });
  }, []);

  // Restore guessed and mode from localStorage
  useEffect(() => {
    const storedGuessed = localStorage.getItem(GUESSED_KEY);
    if (storedGuessed) {
      setGuessed(new Set(JSON.parse(storedGuessed)));
    }
    const storedMode = localStorage.getItem(MODE_KEY);
    if (storedMode === "text" || storedMode === "choice") {
      setMode(storedMode);
    }
  }, []);

  // Save guessed and mode to localStorage
  useEffect(() => {
    localStorage.setItem(GUESSED_KEY, JSON.stringify(Array.from(guessed)));
  }, [guessed]);
  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  // Reset state when Pokémon or mode changes
  useEffect(() => {
    if (!allPokemon.length) return;
    const current = allPokemon[currentIdx];
    setInput("");
    setMessage("");
    setRevealed(Array(current.name.length).fill(false));
    setIncorrect(0); // Reset incorrect guesses on new Pokémon or mode
    if (mode === "choice") {
      // Pick 3 random incorrect names
      const others = shuffle(allPokemon.filter(p => p.id !== current.id)).slice(0, 3).map(p => p.name);
      setChoices(shuffle([current.name, ...others]));
    }
  }, [currentIdx, mode, allPokemon]);

  // Progress bar calculation
  const progress = allPokemon.length ? (guessed.size / allPokemon.length) * 100 : 0;

  // Mode toggle handler
  const handleModeToggle = (m: Mode) => setMode(m);

  // Next Pokémon
  const nextPokemon = () => {
    if (!allPokemon.length) return;
    let idx = Math.floor(Math.random() * allPokemon.length);
    let tries = 0;
    while (guessed.has(allPokemon[idx].id) && tries < 10) {
      idx = Math.floor(Math.random() * allPokemon.length);
      tries++;
    }
    setCurrentIdx(idx);
  };

  const current = allPokemon[currentIdx];

  // Handle text guess input (Hangman-style)
  const handleTextInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (!current) return;
    const name = current.name.toLowerCase();
    const guess = val.toLowerCase();
    let newRevealed = [...revealed];
    let newIncorrect = incorrect;
    for (let i = 0; i < name.length; i++) {
      if (guess[i] === name[i]) {
        newRevealed[i] = true;
      } else if (guess[i] && guess[i] !== name[i] && !revealed[i]) {
        newIncorrect = Math.min(6, newIncorrect + 1);
      }
    }
    setRevealed(newRevealed);
    setIncorrect(newIncorrect);
    // If fully revealed
    if (newRevealed.every(Boolean) && guess.length === name.length) {
      setMessage("Correct!");
      setGuessed(new Set([...guessed, current.id]));
      setTimeout(() => {
        setMessage("");
        nextPokemon();
      }, 1000);
    }
  };

  // Handle 4-choice selection
  const handleChoice = (choice: string) => {
    if (!current) return;
    if (choice === current.name) {
      setMessage("Correct!");
      setGuessed(new Set([...guessed, current.id]));
      setTimeout(() => {
        setMessage("");
        nextPokemon();
      }, 1000);
    } else {
      setMessage("Try again!");
      setTimeout(() => setMessage(""), 700);
    }
  };

  // Render Hangman-style blanks (improved, always show blanks)
  const renderBlanks = () => {
    if (!current) return null;
    return (
      <div className="flex gap-2 mb-2">
        {current.name.split("").map((char, i) => (
          <span
            key={i}
            className="border-b-2 border-blue-600 w-8 text-center text-2xl text-blue-700"
            style={{ letterSpacing: 4 }}
          >
            {input[i] && input[i].toLowerCase() === char.toLowerCase() ? char.toUpperCase() : "_"}
          </span>
        ))}
      </div>
    );
  };

  // Render 4 choices
  const renderChoices = () => (
    <div className="flex flex-col gap-2 w-full items-center">
      {choices.map((c, i) => (
        <button
          key={i}
          className="w-48 px-4 py-2 bg-blue-200 hover:bg-blue-400 rounded text-black"
          onClick={() => handleChoice(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-white text-black font-['Press_Start_2P']">
      <div className="flex flex-col items-center justify-center w-full max-w-md p-4 flex-grow">
        {/* Game Card */}
        <h1 className="text-2xl mb-6 tracking-widest">Pokillionaire</h1>
        <div className="mb-4">
          <button
            className={`px-4 py-2 rounded mr-2 ${mode === "text" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"}`}
            onClick={() => handleModeToggle("text")}
          >
            Text Guess
          </button>
          <button
            className={`px-4 py-2 rounded ${mode === "choice" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"}`}
            onClick={() => handleModeToggle("choice")}
          >
            4 Choice
          </button>
        </div>
        <div className="w-full bg-gray-100 rounded-lg shadow p-6 flex flex-col items-center" style={{backgroundImage: "linear-gradient(90deg, #f3f3f3 1px, transparent 1px), linear-gradient(#f3f3f3 1px, transparent 1px)", backgroundSize: "20px 20px"}}>
          {/* Game Area */}
          {/* HangmanDrawing removed */}
          <div className="w-32 h-32 bg-gray-300 rounded mb-4 flex items-center justify-center overflow-hidden">
            {current ? (
              <img src={current.sprite} alt={current.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-gray-500">[Sprite]</span>
            )}
          </div>
          <div className="w-full flex flex-col items-center">
            <span className="text-lg tracking-widest mb-2">
              {current ? `#${guessed.size} / ${allPokemon.length}` : "_ _ _ _ _ _ _"}
            </span>
            {mode === "text" && (
              <>
                {renderBlanks()}
                <input
                  className="mt-2 px-2 py-1 border rounded text-black font-mono tracking-widest"
                  type="text"
                  value={input}
                  onChange={handleTextInput}
                  maxLength={current ? current.name.length : undefined}
                  autoFocus
                  style={{ fontFamily: "inherit", letterSpacing: 2 }}
                />
              </>
            )}
            {mode === "choice" && renderChoices()}
            {message && <div className="mt-2 text-green-600">{message}</div>}
          </div>
          <button className="mt-4 px-4 py-2 bg-yellow-400 rounded" onClick={nextPokemon}>
            Next Pokémon
          </button>
        </div>
        {/* Hollow grey progress bar below the card */}
        <div className="w-full max-w-md mt-8">
          <div className="text-center mb-2 text-sm text-gray-600">
            Progress: {Math.round(progress)}% ({guessed.size}/{allPokemon.length})
          </div>
          <div className="w-full h-8 bg-gray-300 rounded-full overflow-hidden border-2 border-gray-400">
            <div
              className="h-8 bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
