import { encodeFunctionData } from "viem";
import { z } from "zod";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { DEFAULT_NETWORK, getNetworkConfig, SITE_URL } from "@/lib/config";
import { byteLength, formatUsdc } from "@/lib/format";
import { HttpError, json, route } from "@/lib/server/api";
import { readInbox, resolveRecipient } from "@/lib/server/recipient";

const MAX_MESSAGE_BYTES = 1000;
const TIMEOUT_SECONDS = 7 * 24 * 60 * 60;

const query = z.object({
  to: z.string().min(1, "Pass ?to=<address or handle>.").max(64),
  network: z.enum(["mainnet", "testnet"]).optional(),
  message: z.string().optional(),
});

/**
 * Public, unauthenticated quote for agents and scripts: who the recipient is, what their inbox charges and, when
 * `message` is given, a ready-to-sign transaction. The server never signs or sends anything; the caller's wallet does.
 */
export const GET = route({ bucket: "read", body: query }, async ({ body }) => {
  const network = body.network ?? DEFAULT_NETWORK;
  const net = getNetworkConfig(network);
  const recipient = await resolveRecipient(body.to);
  if (!recipient) throw new HttpError(404, "No inbox with that handle.");

  const inbox = await readInbox(network, recipient.address);
  if (!inbox.deployed) throw new HttpError(503, `StampBox isn't deployed on ${net.chain.name} yet.`);

  const cors = { "access-control-allow-origin": "*", "cache-control": "no-store" };
  const base = {
    network,
    chainId: net.chain.id,
    contract: net.stampBox,
    recipient: {
      address: recipient.address,
      handle: recipient.handle,
      displayName: recipient.displayName,
      url: `${SITE_URL}/${recipient.handle ? `@${recipient.handle}` : recipient.address}`,
    },
    inbox: { open: inbox.open, price: inbox.price.toString(), priceUsdc: formatUsdc(inbox.price), bio: inbox.bio },
    rules: {
      currency: "Native USDC (18 decimals; value is in wei)",
      maxMessageBytes: MAX_MESSAGE_BYTES,
      refundOnReply: true,
      senderCanReclaimAfterSeconds: TIMEOUT_SECONDS,
      messagesArePublic: true,
    },
  };

  if (body.message === undefined) return json(base, { headers: cors });
  if (!inbox.open) throw new HttpError(409, "This inbox is closed.");
  const bytes = byteLength(body.message);
  if (bytes === 0) throw new HttpError(400, "The message is empty.");
  if (bytes > MAX_MESSAGE_BYTES) throw new HttpError(400, `The message is ${bytes} bytes; the limit is ${MAX_MESSAGE_BYTES}.`);

  return json(
    {
      ...base,
      tx: {
        chainId: net.chain.id,
        to: net.stampBox,
        value: inbox.price.toString(),
        data: encodeFunctionData({ abi: stampBoxAbi, functionName: "send", args: [recipient.address, body.message] }),
      },
    },
    { headers: cors },
  );
});
