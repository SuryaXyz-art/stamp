// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title StampBox — a refundable paid inbox on Arc
/// @notice Strangers attach a native-USDC "stamp" to message you. Reply and they get it back;
///         mark it spam and you keep it. If you ignore it for 7 days, the sender can reclaim it.
/// @dev    Non-custodial, immutable, no admin keys, no fees.
///         Amounts are native USDC via `msg.value` (18 decimals on Arc). The ERC-20 USDC
///         interface (6 decimals) is never used here.
///         Message and reply text live only in event logs; storage holds settlement state.
///         If `msg.value` exceeds the receiver's price, the whole `msg.value` is the stamp.
contract StampBox is ReentrancyGuard {
    enum Status {
        Pending,
        Refunded,
        Kept,
        Reclaimed
    }

    struct Stamp {
        address from;
        address to;
        uint128 amount;
        uint64 sentAt;
        Status status;
    }

    uint256 public constant TIMEOUT = 7 days;
    uint256 public constant MAX_MESSAGE_BYTES = 1000;
    uint256 public constant MAX_BIO_BYTES = 160;

    /// @notice Stamp price per receiver, in native USDC wei. 0 = inbox closed.
    mapping(address => uint256) public priceOf;
    /// @notice Optional short public headline shown on the send page.
    mapping(address => string) public bioOf;

    Stamp[] public stamps;
    mapping(address => uint256[]) internal _inbox;
    mapping(address => uint256[]) internal _outbox;

    /// @notice Lifetime totals (native USDC wei) for the landing page stats.
    uint256 public totalSent;
    uint256 public totalRefunded;
    uint256 public totalKept;
    uint256 public totalReclaimed;

    event InboxOpened(address indexed user, uint256 price, string bio);
    event PriceSet(address indexed user, uint256 price);
    event Sent(uint256 indexed id, address indexed from, address indexed to, uint256 amount, string message);
    event Settled(uint256 indexed id, address indexed by, Status status, string reply);

    error InboxClosed();
    error StampTooSmall();
    error NotReceiver();
    error NotSender();
    error TooEarly();
    error AlreadySettled();
    error TransferFailed();
    error MessageTooLong();
    error EmptyMessage();
    error SelfSend();
    error InvalidPrice();
    error BioTooLong();
    error InvalidId();

    // ───────────────────────────── Receiver setup ─────────────────────────────

    /// @notice Open (or reconfigure) your inbox with a stamp price and an optional headline.
    function openInbox(uint256 price, string calldata bio) external {
        if (price == 0) revert InvalidPrice();
        if (bytes(bio).length > MAX_BIO_BYTES) revert BioTooLong();
        priceOf[msg.sender] = price;
        bioOf[msg.sender] = bio;
        emit InboxOpened(msg.sender, price, bio);
    }

    /// @notice Change the price of an open inbox. Existing stamps keep their original amount.
    function setPrice(uint256 price) external {
        if (price == 0) revert InvalidPrice();
        if (priceOf[msg.sender] == 0) revert InboxClosed();
        priceOf[msg.sender] = price;
        emit PriceSet(msg.sender, price);
    }

    /// @notice Stop accepting new stamps. Pending stamps can still be settled or reclaimed.
    function closeInbox() external {
        if (priceOf[msg.sender] == 0) revert InboxClosed();
        priceOf[msg.sender] = 0;
        emit PriceSet(msg.sender, 0);
    }

    // ───────────────────────────────── Sending ────────────────────────────────

    /// @notice Send a message to `to`, attaching `msg.value` native USDC as the stamp.
    /// @dev    Messages are public on-chain and stored only in the `Sent` event.
    function send(address to, string calldata message) external payable returns (uint256 id) {
        uint256 price = priceOf[to];
        if (price == 0) revert InboxClosed();
        if (to == msg.sender) revert SelfSend();
        if (msg.value < price) revert StampTooSmall();
        uint256 len = bytes(message).length;
        if (len == 0) revert EmptyMessage();
        if (len > MAX_MESSAGE_BYTES) revert MessageTooLong();

        id = stamps.length;
        stamps.push(
            Stamp({
                from: msg.sender,
                to: to,
                amount: SafeCast.toUint128(msg.value),
                // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds overflows in ~5.8e11 years
                sentAt: uint64(block.timestamp),
                status: Status.Pending
            })
        );
        _inbox[to].push(id);
        _outbox[msg.sender].push(id);
        totalSent += msg.value;

        emit Sent(id, msg.sender, to, msg.value, message);
    }

    // ──────────────────────────────── Settlement ──────────────────────────────

    /// @notice Receiver replies: the stamp goes back to the sender, the reply is emitted on-chain.
    function refund(uint256 id, string calldata reply) external nonReentrant {
        if (bytes(reply).length > MAX_MESSAGE_BYTES) revert MessageTooLong();
        _refund(id, reply);
    }

    /// @notice Receiver marks the message as spam and keeps the stamp.
    function keep(uint256 id) external nonReentrant {
        _keep(id);
    }

    /// @notice Sender takes the stamp back after `TIMEOUT` if the receiver never acted.
    function reclaim(uint256 id) external nonReentrant {
        Stamp storage s = _pending(id);
        if (s.from != msg.sender) revert NotSender();
        if (block.timestamp < s.sentAt + TIMEOUT) revert TooEarly();

        uint256 amount = s.amount;
        s.status = Status.Reclaimed;
        totalReclaimed += amount;
        emit Settled(id, msg.sender, Status.Reclaimed, "");
        _pay(msg.sender, amount);
    }

    /// @notice Refund many stamps at once (no reply text). All-or-nothing.
    function batchRefund(uint256[] calldata ids) external nonReentrant {
        for (uint256 i; i < ids.length; ++i) {
            _refund(ids[i], "");
        }
    }

    /// @notice Keep many stamps at once (spam sweep). Pays out once at the end. All-or-nothing.
    function batchKeep(uint256[] calldata ids) external nonReentrant {
        uint256 total;
        for (uint256 i; i < ids.length; ++i) {
            total += _markKept(ids[i]);
        }
        _pay(msg.sender, total);
    }

    // ────────────────────────────────── Views ─────────────────────────────────

    function getStamp(uint256 id) external view returns (Stamp memory) {
        if (id >= stamps.length) revert InvalidId();
        return stamps[id];
    }

    function stampsCount() external view returns (uint256) {
        return stamps.length;
    }

    function inboxCount(address user) external view returns (uint256) {
        return _inbox[user].length;
    }

    function outboxCount(address user) external view returns (uint256) {
        return _outbox[user].length;
    }

    /// @notice Stamp ids received by `user`, oldest first, paginated.
    function inboxOf(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _slice(_inbox[user], offset, limit);
    }

    /// @notice Stamp ids sent by `user`, oldest first, paginated.
    function outboxOf(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _slice(_outbox[user], offset, limit);
    }

    // ──────────────────────────────── Internals ───────────────────────────────

    function _pending(uint256 id) internal view returns (Stamp storage s) {
        if (id >= stamps.length) revert InvalidId();
        s = stamps[id];
        if (s.status != Status.Pending) revert AlreadySettled();
    }

    function _refund(uint256 id, string memory reply) internal {
        Stamp storage s = _pending(id);
        if (s.to != msg.sender) revert NotReceiver();

        uint256 amount = s.amount;
        s.status = Status.Refunded;
        totalRefunded += amount;
        // forge-lint: disable-next-line(reentrancy-events) -- callers are nonReentrant
        emit Settled(id, msg.sender, Status.Refunded, reply);
        _pay(s.from, amount);
    }

    function _keep(uint256 id) internal {
        _pay(msg.sender, _markKept(id));
    }

    function _markKept(uint256 id) internal returns (uint256 amount) {
        Stamp storage s = _pending(id);
        if (s.to != msg.sender) revert NotReceiver();

        amount = s.amount;
        s.status = Status.Kept;
        totalKept += amount;
        emit Settled(id, msg.sender, Status.Kept, "");
    }

    function _pay(address to, uint256 amount) internal {
        // Every caller is nonReentrant and has already written its state change (CEI).
        // Recipients come from stored stamp state or msg.sender, never from calldata.
        // forge-lint: disable-next-line(arbitrary-send-eth, reentrancy-eth, calls-loop)
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _slice(uint256[] storage arr, uint256 offset, uint256 limit) internal view returns (uint256[] memory out) {
        uint256 len = arr.length;
        if (offset >= len) return new uint256[](0);
        uint256 end = limit > len - offset ? len : offset + limit;
        out = new uint256[](end - offset);
        for (uint256 i; i < out.length; ++i) {
            out[i] = arr[offset + i];
        }
    }
}
