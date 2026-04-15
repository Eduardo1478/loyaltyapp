import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, collection, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// Register for push notifications and store the Expo push token in Firestore.
// Silent no-op if permissions are denied or running on a simulator.
export async function registerPushToken(userId) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await updateDoc(doc(db, 'users', userId), { expoPushToken: token });
  } catch {
    // Non-fatal — push notifications won't work on simulators
  }
}

// Send a push notification to all followers of a business when a new coupon is created.
// Fire-and-forget: coupon is already saved before this is called.
export async function notifyFollowers({ businessId, businessName, couponTitle, discount }) {
  try {
    const followsSnap = await getDocs(
      query(collection(db, 'follows'), where('businessId', '==', businessId))
    );
    if (followsSnap.empty) return;

    const userIds = followsSnap.docs.map((d) => d.data().userId);
    const userDocs = await Promise.all(
      userIds.map((uid) => getDoc(doc(db, 'users', uid)))
    );

    const tokens = userDocs
      .filter((d) => d.exists() && d.data().expoPushToken)
      .map((d) => d.data().expoPushToken);

    if (tokens.length === 0) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept:         'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: businessName,
          body:  `${couponTitle} — ${discount}`,
          data:  { businessId },
        }))
      ),
    });
  } catch {
    // Non-fatal — coupon is already saved; notification failure is acceptable
  }
}
