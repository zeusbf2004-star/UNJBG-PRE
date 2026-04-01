import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../shared/config/firebase';

export function useSubscriptions() {
    const [subscriptions, setSubscriptions] = useState({
        subscribed_topics: [],
        subscribed_courses: []
    });
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    const loadSubscriptions = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            // 1. Fetch subscriptions
            const subRef = doc(db, 'user_subscriptions', userId);
            const subSnap = await getDoc(subRef);
            
            if (subSnap.exists()) {
                setSubscriptions(subSnap.data());
            }

            // 2. Fetch user profile for premium status from user_scores
            const userRef = doc(db, 'user_scores', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setIsPremium(!!userSnap.data().isPremium);
            }
        } catch (error) {
            console.error("Error loading subscriptions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubscriptions();
    }, [loadSubscriptions]);

    const toggleTopicSubscription = async (topicId) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const newTopics = subscriptions.subscribed_topics.includes(topicId)
            ? subscriptions.subscribed_topics.filter(id => id !== topicId)
            : [...subscriptions.subscribed_topics, topicId];

        const updatedSubs = {
            ...subscriptions,
            subscribed_topics: newTopics,
            updated_at: serverTimestamp()
        };

        try {
            await setDoc(doc(db, 'user_subscriptions', userId), updatedSubs, { merge: true });
            setSubscriptions(updatedSubs);
            return true;
        } catch (error) {
            console.error("Error updating topic subscription:", error);
            return false;
        }
    };

    const toggleCourseSubscription = async (courseName) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const isSubscribed = subscriptions.subscribed_courses.includes(courseName);
        
        // Muro de pago: Max 3 cursos si no es premium
        if (!isSubscribed && !isPremium && subscriptions.subscribed_courses.length >= 3) {
            alert("Has alcanzado el límite de 3 cursos para usuarios gratuitos. ¡Pásate a Premium para mazos ilimitados!");
            return false;
        }

        const newCourses = isSubscribed
            ? subscriptions.subscribed_courses.filter(c => c !== courseName)
            : [...subscriptions.subscribed_courses, courseName];

        const updatedSubs = {
            ...subscriptions,
            subscribed_courses: newCourses,
            updated_at: serverTimestamp()
        };

        try {
            await setDoc(doc(db, 'user_subscriptions', userId), updatedSubs, { merge: true });
            setSubscriptions(updatedSubs);
            return true;
        } catch (error) {
            console.error("Error updating course subscription:", error);
            return false;
        }
    };

    return {
        subscriptions,
        loading,
        isPremium,
        toggleTopicSubscription,
        toggleCourseSubscription,
        refresh: loadSubscriptions
    };
}
