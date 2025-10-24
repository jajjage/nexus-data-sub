# Deep Dive: Chat and Notification Systems

This document provides a detailed explanation of the chat and notification systems, outlining their architecture, functionality, and real-world use cases.

## Chat System

The chat system is designed to provide real-time communication between users and support staff. It is built on a foundation of WebSockets for instant message delivery, with a PostgreSQL database for persistent storage and Redis for caching and message queuing.

### Core Components

- **WebSocket Server**: The heart of the chat system, responsible for managing persistent connections with clients and enabling real-time, bidirectional communication.
- **Chat Service**: The central business logic layer that handles message processing, channel management, and user presence.
- **Database**: A PostgreSQL database that stores all chat-related data, including channels, messages, and user information.
- **API Endpoints**: A set of RESTful endpoints for managing chat channels and retrieving message history.

### How It Works: A Real-World Example

Let's walk through a typical user journey to understand how the chat system functions in practice.

**Scenario**: A user, Alice, needs help with a recent transaction and decides to contact support.

1. **Initiating a Support Chat**:
   - Alice clicks the "Contact Support" button in the app.
   - The app sends a `POST` request to the `/api/chat/support` endpoint.
   - The `ChatController` receives the request and calls the `ChatService.createSupportChannel` method.
   - The `ChatService` creates a new channel in the `channels` table and adds Alice as a member in the `channel_members` table.
   - The newly created channel information is returned to Alice's app.

2. **Connecting to the WebSocket Server**:
   - Alice's app uses the channel information to establish a WebSocket connection with the server.
   - The server authenticates the connection and adds Alice to a "room" corresponding to the channel ID. This ensures that she will only receive messages intended for her support channel.

3. **Sending and Receiving Messages**:
   - Alice types her message and hits "send."
   - The app sends the message over the WebSocket connection to the server.
   - The `ChatService` receives the message, persists it to the `messages` table in the database, and then broadcasts it to all other members of the channel's room (in this case, the support agent).
   - The support agent, Bob, who is also connected to the WebSocket server, receives the message in real-time.

4. **Handling Offline Users**:
   - If Bob is not online when Alice sends her message, the `ChatService` detects his offline status.
   - The `ChatService` then calls the `NotificationService` to send a push notification to Bob, alerting him of the new message.

5. **Retrieving Message History**:
   - When Bob opens the chat, his app sends a `GET` request to the `/api/chat/channels/{channelId}/messages` endpoint.
   - The `ChatController` retrieves the message history from the database and sends it back to Bob's app, allowing him to catch up on the conversation.

## Notification System

The notification system is responsible for delivering timely and relevant information to users, even when they are not actively using the app. It leverages Firebase Cloud Messaging (FCM) to send push notifications to iOS, Android, and web clients.

### Core Components

- **Notification Service**: The primary service that manages the creation, targeting, and sending of notifications.
- **Firebase Service**: A dedicated service that integrates with the Firebase Admin SDK to handle the technical aspects of sending push notifications.
- **Database**: The PostgreSQL database stores notification templates, user preferences, and a history of all sent notifications.
- **API Endpoints**: A set of endpoints for registering device tokens and, for administrative users, creating and sending notifications.

### How It Works: A Real-World Example

Let's explore how the notification system works through a couple of common scenarios.

**Scenario 1**: A user, Charlie, receives a notification about a new feature.

1. **Creating a Targeted Notification**:
   - An administrator decides to announce a new feature to all users who have signed up in the last 30 days.
   - The administrator uses a dashboard to create a new notification, providing a title, body, and the targeting criteria (registration date within the last 30 days).
   - The dashboard sends a `POST` request to the `/api/notifications` endpoint.

2. **Processing and Sending the Notification**:
   - The `NotificationController` receives the request and calls the `NotificationService.createAndSend` method.
   - The `NotificationService` first creates a record of the notification in the `notifications` table.
   - It then queries the database to find all users who match the targeting criteria.
   - For each matching user, it retrieves their push tokens from the `push_tokens` table.
   - Finally, it calls the `FirebaseService` to send the push notification to all the collected tokens.

**Scenario 2**: A user, Dana, opts out of promotional notifications.

1. **Managing Notification Preferences**:
   - Dana goes to the settings screen in the app and unchecks the "Promotional Offers" category.
   - The app sends a `PUT` request to the `/api/users/me/notification-preferences` endpoint.
   - The `UserNotificationPreferenceController` updates Dana's preferences in the `user_notification_preferences` table.

2. **Respecting User Preferences**:
   - When the administrator sends a promotional notification, the `NotificationService` will now automatically exclude Dana from the recipient list, ensuring that her preferences are respected.

This deep dive provides a comprehensive overview of the chat and notification systems. By understanding their architecture and functionality, we can better maintain and enhance these critical features in the future.
