import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import helloworld_program from "../helloworld/build/main.aleo?raw";
import tic_tac_toe from "../tic_tac_toe/build/main.aleo?raw";
import { AleoWorker } from "./workers/AleoWorker.js";
import {
  Account,
  ProgramManager,
  PrivateKey,
  initThreadPool,
  AleoKeyProvider,
  AleoNetworkClient,
  NetworkRecordProvider,
} from "@aleohq/sdk";

const aleoWorker = AleoWorker();

const calculateWinner = (squares) => {
  console.log("calculateWinner");
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  console.log("squares", squares);
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    console.log("a,b,c", a, b, c, "lines[i]", lines[i]);
    console.log("squares[a]", squares[a]);
    // X = X = X 같이 3개의 값이 모두 같을 때
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      console.log("squares2", squares);
      return squares[a];
    }
  }
  return null;
};

function App() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [count, setCount] = useState(0);
  const [account, setAccount] = useState(null);
  const [newExecuting, setNewExecuting] = useState(false);
  const [netNewExecuting, netSetNewExecuting] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const generateAccount = async () => {
    const key = await aleoWorker.getPrivateKey();
    setAccount(await key.to_string());
  };

  const handleClick = async (i) => {
    console.log("handleClick");
    console.log("i", i);
    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    //xIsNext == true >> 0,2,4,6,8 >> i=0,2,4~ 1u8
    //xIsNext == false >> 1,3,5,7 >> i=1,3,5~ 2u8

    //make_move  : player : u8 / row : u8 / col : u8  / board  { r1: { c1: 0u8, c2: 0u8, c3: 0u8 }, r2: { c1: 0u8, c2: 0u8, c3: 0u8 }, r3: { c1: 0u8, c2: 0u8, c3: 0u8 } }
    // 0 = 1u8, 1u8
    // 1 = 1u8, 2u8
    // 2 = 1u8, 3u8
    // 3 = 2u8, 1u8
    // 4 = 2u8, 2u8
    // 5 = 2u8, 3u8
    // 6 = 3u8, 1u8
    // 7 = 3u8, 2u8
    // 8 = 3u8, 3u8

    const newSquares = squares.slice();
    console.log("newSquares", newSquares);
    newSquares[i] = xIsNext ? "X" : "O";
    console.log("xIsNext", xIsNext);
    console.log("newSquares", newSquares);

    console.log("newSquares[i]", newSquares[i]);
    console.log("xIsNext", xIsNext);
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  };

  useEffect(() => {
    // Check for winner or tie
    const winner = calculateWinner(squares);
    if (winner) {
      alert(`Winner: ${winner}`);
    } else if (squares.every((square) => square)) {
      alert("It's a tie!");
    }
  }, [squares]);

  async function local_new_board() {
    setNewExecuting(true);
    const result = await aleoWorker.localProgramExecution(
      tic_tac_toe,
      "new",
      []
    );
    setNewExecuting(false);
    console.log("result", result);
  }

  //NetworkProgramExecution
  async function deploy() {
    setDeploying(true);
    try {
      const result = await aleoWorker.deployProgram(tic_tac_toe);
      console.log("Transaction:");
      console.log("https://explorer.hamp.app/transaction?id=" + result);
      alert("Transaction ID: " + result);
    } catch (e) {
      console.log(e);
      alert("Error with deployment, please check console for details");
    }
    setDeploying(false);
  }

  async function network_new_board() {
    netSetNewExecuting(true);

    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache = true;

    const account = new Account({
      privateKey: import.meta.env.VITE_APP_PRIVATEKEY,
    });

    const networkClient = new AleoNetworkClient(
      "https://api.explorer.aleo.org/v1"
    );
    const recordProvider = new NetworkRecordProvider(account, networkClient);

    const programName = "tic_tac_toe.aleo";
    const programManager = new ProgramManager(
      "https://api.explorer.aleo.org/v1",
      keyProvider,
      recordProvider
    );
    programManager.setAccount(account);

    const keySearchParams = { cacheKey: "tic_tac_toe:new" };
    const tx_id = await programManager.execute(
      programName,
      "tic_tac_toe",
      8,
      [],
      undefined,
      undefined,
      keySearchParams
    );
    const transaction = await programManager.networkClient.getTransaction(
      tx_id
    );

    netSetNewExecuting(false);
    console.log(transaction);
    alert(JSON.stringify(transaction));
  }

  return (
    <>
      <div>
        <a href="https://aleo.org" target="_blank">
          <img src={aleoLogo} className="logo" alt="Aleo logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      {/* newExecuting */}
      <h1>Aleo + React Tic Tac Toe</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          <button onClick={generateAccount}>
            {account
              ? `Account is ${JSON.stringify(account)}`
              : `Click to generate account`}
          </button>
        </p>

        <p>
          <button disabled={newExecuting} onClick={local_new_board}>
            {newExecuting
              ? `Executing...check console for details...`
              : `Execute Local New Board`}
          </button>
        </p>

        <p>
          <button disabled={netNewExecuting} onClick={network_new_board}>
            {netNewExecuting
              ? `Executing...check console for details...`
              : `Execute Aleo Network New Board`}
          </button>
        </p>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>

      {/* Tic Tac Toe Board */}
      {
        <div className="game-board-container">
          <div className="game-board">
            <div className="board-row">
              {squares.slice(0, 3).map((value, index) => (
                <button
                  key={index}
                  className="square"
                  onClick={() => handleClick(index)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="board-row">
              {squares.slice(3, 6).map((value, index) => (
                <button
                  key={index + 3}
                  className="square"
                  onClick={() => handleClick(index + 3)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="board-row">
              {squares.slice(6, 9).map((value, index) => (
                <button
                  key={index + 6}
                  className="square"
                  onClick={() => handleClick(index + 6)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      }

      {/* Advanced Section */}
      <div className="card">
        <h2>Advanced Actions</h2>
        <p>
          Deployment on Aleo requires certain prerequisites like seeding your
          wallet with credits and retrieving a fee record. Check README for more
          details.
        </p>
        <p>
          <button disabled={deploying} onClick={deploy}>
            {deploying
              ? `Deploying...check console for details...`
              : `Deploy tic_tac_toe.aleo`}
          </button>
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Aleo and React logos to learn more
      </p>
    </>
  );
}

export default App;
