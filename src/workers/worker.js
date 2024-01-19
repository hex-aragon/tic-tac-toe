import {
  Account,
  ProgramManager,
  PrivateKey,
  initThreadPool,
  AleoKeyProvider,
  AleoNetworkClient,
  NetworkRecordProvider,
} from "@aleohq/sdk";
import { expose, proxy } from "comlink";

await initThreadPool();

async function localProgramExecution(program, aleoFunction, inputs) {
  try {
    const programManager = new ProgramManager();

    console.log("programManager", programManager);
    // 프로그램 실행을 위한 임시 계정 생성
    const account = new Account();
    console.log("account", account);
    programManager.setAccount(account);
    console.log("programManager2", programManager);
    const executionResponse = await programManager.run(
      program,
      aleoFunction,
      inputs,
      false
    );
    console.log("executionResponse", executionResponse);

    if (executionResponse) {
      console.log(
        "executionResponse.getOutputs()",
        executionResponse.getOutputs()
      );
      return executionResponse.getOutputs();
    } else {
      throw new Error("Execution response is undefined or null");
    }
  } catch (error) {
    console.error("localProgramExecution에서 오류 발생:", error);
    throw error; // 다른 곳에서 잡힐 오류를 재전송
  }
}

async function offlineProgramExecution(program, aleoFunction, inputs) {
  const programManager = new ProgramManager();

  // Create a temporary account for the execution of the program
  const account = new Account();
  programManager.setAccount(account);

  // const executionResponse = await programManager.run(
  //   program,
  //   aleoFunction,
  //   inputs,
  //   false,
  // );
  const executionResponse = await programManager.executeOffline(
    program,
    aleoFunction,
    inputs
  );
  return executionResponse.getOutputs();
}

async function NetworkProgramExecution(program, aleoFunction, inputs) {
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache = true;
  // Use existing account with funds
  const account = new Account({
    privateKey: import.meta.env.PrivateKey,
  });

  // Create a record provider that will be used to find records and transaction data for Aleo programs
  const networkClient = new AleoNetworkClient(
    "https://api.explorer.aleo.org/v1"
  );
  const recordProvider = new NetworkRecordProvider(account, networkClient);

  // Initialize a program manager to talk to the Aleo network with the configured key and record providers
  const programName = "tic_tac_toe.aleo";
  const programManager = new ProgramManager(
    "https://api.explorer.aleo.org/v1",
    keyProvider,
    recordProvider
  );

  // Provide a key search parameter to find the correct key for the program if they are stored in a memory cache
  const keySearchParams = { cacheKey: `${program}:${aleoFunction}` };
  const tx_id = await programManager.execute(
    programName,
    "tic_tac_toe",
    8,
    inputs,
    undefined,
    undefined,
    undefined,
    keySearchParams
  );
  const transaction = await programManager.networkClient.getTransaction(tx_id);

  return transaction;
}

async function getPrivateKey() {
  const key = new PrivateKey();
  return proxy(key);
}

async function deployProgram(program) {
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  // Create a record provider that will be used to find records and transaction data for Aleo programs
  const networkClient = new AleoNetworkClient(
    "https://api.explorer.aleo.org/v1"
  );

  // Use existing account with funds
  const account = new Account({
    privateKey: import.meta.env.PrivateKey,
  });

  const recordProvider = new NetworkRecordProvider(account, networkClient);

  // Initialize a program manager to talk to the Aleo network with the configured key and record providers
  const programManager = new ProgramManager(
    "https://api.explorer.aleo.org/v1",
    keyProvider,
    recordProvider
  );

  programManager.setAccount(account);

  // Define a fee to pay to deploy the program
  const fee = 8; // 1.9 Aleo credits

  // Deploy the program to the Aleo network
  const tx_id = await programManager.deploy(program, fee);

  // Optional: Pass in fee record manually to avoid long scan times
  // const feeRecord = "{  owner: aleo1xxx...xxx.private,  microcredits: 2000000u64.private,  _nonce: 123...789group.public}";
  // const tx_id = await programManager.deploy(program, fee, undefined, feeRecord);

  return tx_id;
}

const workerMethods = {
  localProgramExecution,
  getPrivateKey,
  deployProgram,
  offlineProgramExecution,
  NetworkProgramExecution,
};
expose(workerMethods);
