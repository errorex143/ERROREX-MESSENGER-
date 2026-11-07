# ERROREX Security Specification & Threat Model

## 1. Data Invariants

1. **Identity & Ownership Invariant**:
   - A user profile (`/userProfiles/{userId}`) can only be created or modified by the authenticated user whose `request.auth.uid == userId`.
   - Sensitive credentials (`/users/{userId}/private/credentials`) cannot be modified or read by other users.
   - User settings (`/userSettings/{userId}`) can only be read and written by the owning user (`request.auth.uid == userId`).

2. **Secret PIN Security Invariant**:
   - Plaintext PINs are NEVER stored anywhere in Firestore.
   - Verification of the 8-digit secret PIN is performed server-side via the protected Node/Express `/api/verify-pin` endpoint using cryptographic salt + PBKDF2/scrypt, rate-limiting, and temporary cooldown locks.

3. **Message & Conversation Access Invariant**:
   - A user can only access, list, read, or send messages in a conversation where `request.auth.uid in resource.data.participants` (or incoming participants on creation).
   - A user can only create a message in a conversation where they are an active participant, and `incoming().senderId == request.auth.uid`.
   - Message deletions or edits can only be performed by the message's original author.

4. **Friendship & Request Invariant**:
   - A friend request can only be sent if `incoming().senderId == request.auth.uid` and `incoming().receiverId != request.auth.uid` (no self-requests).
   - Only the receiver can accept or reject a request.
   - Only participants in a friendship can read the friendship record.

5. **WebRTC Call Signaling Invariant**:
   - A call document can only be created by `incoming().callerId == request.auth.uid`.
   - Only the caller or receiver (`request.auth.uid in [resource.data.callerId, resource.data.receiverId]`) can read or update call signaling states (offer, answer, status).

6. **Status Stories Invariant**:
   - A status can only be created where `incoming().userId == request.auth.uid`.
   - A status cannot be updated after creation except for appending viewers.

---

## 2. The "Dirty Dozen" Threat Payloads (Must be Denied)

1. **Payload 1 - Identity Spoofing**: Attempt to create a `/userProfiles/victim_uid` with `request.auth.uid == attacker_uid`.
   - Result: PERMISSION_DENIED.

2. **Payload 2 - Shadow Ghost Field Injection**: Attempt to create userProfile with `{ isSuperAdmin: true, bypassPin: true }`.
   - Result: PERMISSION_DENIED.

3. **Payload 3 - Unauthorized Message Reading**: Attacker attempts to list or get messages in a conversation where `attacker_uid` is not in `participants`.
   - Result: PERMISSION_DENIED.

4. **Payload 4 - Sender ID Impersonation**: Attacker attempts to post a message with `senderId: victim_uid`.
   - Result: PERMISSION_DENIED.

5. **Payload 5 - PII Scraping**: Attacker attempts to read `/users/victim_uid/private/credentials`.
   - Result: PERMISSION_DENIED.

6. **Payload 6 - Self-Friend Request**: User sends friend request with `senderId == receiverId`.
   - Result: PERMISSION_DENIED.

7. **Payload 7 - Unsolicited Call Hijacking**: Third-party attempts to update call answer or candidates on a call between user A and user B.
   - Result: PERMISSION_DENIED.

8. **Payload 8 - Status Overwrite Attack**: Attacker attempts to delete or overwrite victim's 24h status story.
   - Result: PERMISSION_DENIED.

9. **Payload 9 - Giant Buffer Overflow Injection**: Inject 1MB payload string into chat message or display name to exhaust quota.
   - Result: PERMISSION_DENIED.

10. **Payload 10 - Group Admin Escalation**: Member attempts to promote themselves to admin without existing admin privileges.
    - Result: PERMISSION_DENIED.

11. **Payload 11 - Message Edit by Recipient**: Recipient attempts to modify text of a message sent by another user.
    - Result: PERMISSION_DENIED.

12. **Payload 12 - Unauthenticated Read**: Unauthenticated user attempts to read `/conversations` or `/userProfiles`.
    - Result: PERMISSION_DENIED.
