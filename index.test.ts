import { describe, it, expect, jest, beforeAll, afterAll } from "@jest/globals";
import { pubSub, topic, type Unsubscribe } from "./index";

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

describe("library", () => {
  describe("pubSub function", () => {
    it("should create a new PubSub instance", () => {
      const pub = pubSub();
      expect(pub).toBeTruthy();
    });

    it("should create and retrieve the same topic on subsequent calls", () => {
      const pub = pubSub();
      const firstCall = pub.topic("test");
      const secondCall = pub.topic("test");
      expect(firstCall).toBe(secondCall);
    });
  });

  describe("pubSub instance", () => {
    it("should unsubscribe all subscribers from all topics", () => {
      const pub = pubSub();
      const testTopic1 = pub.topic("test1");
      const testTopic2 = pub.topic("test2");
      const mockSubscriber1 = jest.fn();
      const mockSubscriber2 = jest.fn();
      testTopic1.sub(mockSubscriber1);
      testTopic2.sub(mockSubscriber2);
      pub.unSubAll();
      testTopic1.pub("hello");
      jest.runAllTimers();
      testTopic2.pub("world");
      jest.runAllTimers();
      expect(mockSubscriber1).not.toHaveBeenCalled();
      expect(mockSubscriber2).not.toHaveBeenCalled();
    });
  });

  describe("Topic", () => {
    describe("Subscription and Unsubscription", () => {
      it("should allow subscription to a topic", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        testTopic.sub(mockSubscriber);
        testTopic.pub("hello");
        jest.runAllTimers();
        expect(mockSubscriber).toHaveBeenCalledWith("hello");
      });

      it("should allow unsubscription using the unSub method", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        testTopic.sub(mockSubscriber);
        testTopic.unSub(mockSubscriber);
        testTopic.pub("hello");
        jest.runAllTimers();
        expect(mockSubscriber).not.toHaveBeenCalled();
      });

      it("should allow unsubscription from a topic", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        const unsubscribe = testTopic.sub(mockSubscriber);
        unsubscribe();
        testTopic.pub("hello");
        jest.runAllTimers();
        expect(mockSubscriber).not.toHaveBeenCalled();
      });

      it("should call subscribers in the order they subscribed", () => {
        const testTopic = topic();
        const callOrder: number[] = [];
        testTopic.sub(() => callOrder.push(1));
        testTopic.sub(() => callOrder.push(2));
        testTopic.pub();
        jest.runAllTimers();
        expect(callOrder).toEqual([1, 2]);
      });

      it("should call a subscriber that subscribed during message processing in the same publication due to queue", () => {
        const testTopic = topic();
        const subscriber = jest.fn();
        const mainSubscriber = jest.fn(() => testTopic.sub(subscriber));
        testTopic.sub(mainSubscriber);
        testTopic.pub();
        jest.runAllTimers();
        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(mainSubscriber).toHaveBeenCalledTimes(1);
        testTopic.pub();
        jest.runAllTimers();
        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(mainSubscriber).toHaveBeenCalledTimes(2);
      });

      it("should not call a subscriber that unsubscribed during message processing", () => {
        const testTopic = topic();
        let unsubscribe: Unsubscribe;
        const subscriber = jest.fn(() => unsubscribe());
        unsubscribe = testTopic.sub(subscriber);
        testTopic.pub();
        jest.runAllTimers();
        expect(subscriber).toHaveBeenCalledTimes(1);
      });
    });

    describe("Context Binding", () => {
      it("should handle context binding correctly", () => {
        const testTopic = topic();
        const context = { value: "context" };
        const mockSubscriber = jest.fn(function (this: any) {
          expect(this.value).toBe("context");
        });
        testTopic.sub(mockSubscriber, context);
        testTopic.pub();
        jest.runAllTimers();
      });

      it("should handle context binding correctly with once", () => {
        const testTopic = topic();
        const context = { value: "context" };
        const mockSubscriber = jest.fn(function (this: any) {
          expect(this.value).toBe("context");
        });
        testTopic.once(mockSubscriber, context);
        testTopic.pub();
        jest.runAllTimers();
      });
    });

    describe("One-Time Subscription", () => {
      it("should allow one-time subscription to a topic", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        testTopic.once(mockSubscriber);
        testTopic.pub("hello");
        jest.runAllTimers();
        testTopic.pub("world");
        jest.runAllTimers();
        expect(mockSubscriber).toHaveBeenCalledTimes(1);
        expect(mockSubscriber).toHaveBeenCalledWith("hello");
      });

      it("should return false when unsub is called multiple times", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        const unsubscribe: Unsubscribe = testTopic.once(mockSubscriber);
        const firstAttempt = unsubscribe();
        const secondAttempt = unsubscribe();
        expect(firstAttempt).toBe(true);
        expect(secondAttempt).toBe(false);
      });

      it("should execute unsubscribe function when subscribed with once", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        const unsubscribe: Unsubscribe = testTopic.once(mockSubscriber);
        testTopic.pub("hello");
        jest.runAllTimers();
        expect(unsubscribe()).toBe(false);
      });

      it("should not call the subscriber function if unsubscribe is called before a message is published when subscribed with once", () => {
        const testTopic = topic();
        const mockSubscriber = jest.fn();
        const unsubscribe: Unsubscribe = testTopic.once(mockSubscriber);
        unsubscribe();
        testTopic.pub("hello");
        jest.runAllTimers();
        expect(mockSubscriber).not.toHaveBeenCalled();
      });
    });

    describe("Unsubscribing All Subscribers", () => {
      it("should unsubscribe all subscribers", () => {
        const testTopic = topic();
        const mockSubscriber1 = jest.fn();
        const mockSubscriber2 = jest.fn();
        testTopic.sub(mockSubscriber1);
        testTopic.sub(mockSubscriber2);
        testTopic.unSubAll();
        testTopic.pub("hello");
        jest.runAllTimers();
        expect(mockSubscriber1).not.toHaveBeenCalled();
        expect(mockSubscriber2).not.toHaveBeenCalled();
      });
    });

    describe("Argument Order", () => {
      it("should maintain the order of arguments when publishing", () => {
        const values = [1, "qwerty", 3];
        const orderTopic = topic();

        orderTopic.sub((...args) => {
          expect(args).toStrictEqual(values);
        });

        orderTopic.pub(...values);
        jest.runAllTimers();
      });
    });

    describe("Error handling", () => {
      it("should catch and log errors from subscriber", () => {
        const error = new Error("Test error");
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});

        const testTopic = topic();
        testTopic.sub(() => {
          throw error;
        });
        testTopic.pub();
        jest.runAllTimers();

        expect(spy).toHaveBeenCalledWith(error);
        spy.mockReset();
      });
    });
  });
});
