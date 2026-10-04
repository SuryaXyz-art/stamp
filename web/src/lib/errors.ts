import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { FAUCET_URL } from "./chains";

export type FriendlyError = { title: string; description?: string; action?: { label: string; href: string } };

const revertMessages: Record<string, string> = {
  InboxClosed: "This inbox is closed right now.",
  StampTooSmall: "The stamp is below this inbox's price. The price may have just changed, so refresh and try again.",
  NotReceiver: "Only the inbox owner can do that.",
  NotSender: "Only the sender can reclaim this stamp.",
  TooEarly: "You can reclaim this stamp once the 7-day window has passed.",
  AlreadySettled: "This stamp has already been settled.",
  TransferFailed: "The USDC transfer was rejected by the recipient's wallet.",
  MessageTooLong: "That message is over 1,000 bytes. Trim it a little.",
  EmptyMessage: "Write a message first.",
  SelfSend: "You can't stamp your own inbox.",
  InvalidPrice: "The price must be more than $0.",
  BioTooLong: "Keep your headline under 160 characters.",
  InvalidId: "That stamp doesn't exist.",
  ReentrancyGuardReentrantCall: "Something tried to call the contract twice at once. Please retry.",
};

/** Maps wallet, RPC and contract errors to something a human can act on. */
export function toFriendlyError(error: unknown): FriendlyError {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return { title: "Cancelled in wallet", description: "No USDC was spent." };
    }
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? "";
      if (revertMessages[name]) return { title: revertMessages[name] };
    }
    const text = `${error.shortMessage} ${error.details ?? ""}`.toLowerCase();
    if (text.includes("insufficient funds") || text.includes("exceeds the balance")) {
      return {
        title: "Not enough USDC",
        description: "You need USDC on Arc for the stamp plus a tiny gas fee.",
        action: { label: "Get USDC", href: FAUCET_URL },
      };
    }
    if (text.includes("chain") && text.includes("mismatch")) {
      return { title: "Wrong network", description: "Switch your wallet to Arc and try again." };
    }
    if (text.includes("rejected") || text.includes("denied")) {
      return { title: "Cancelled in wallet", description: "No USDC was spent." };
    }
    return { title: "Transaction failed", description: error.shortMessage };
  }
  if (error instanceof Error) return { title: "Something went wrong", description: error.message };
  return { title: "Something went wrong" };
}
