/**
 * Comprehensive Integration Tests - Real-time Synchronization
 * Tests real-time updates, subscription management, and cross-client sync
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionManager } from '@/lib/SubscriptionManager';
import { realTimeTeamCalculations } from '@/utils/realTimeTeamCalculations';

// Use test environment configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;
let subscriptionManager: SubscriptionManager;

// Test cleanup tracking
const cleanup = {
  channels: [] as string[],
  testData: [] as any[]
};

describe('Real-time Synchronization Integration Tests', () => {
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    subscriptionManager = new SubscriptionManager(supabase);

    // Verify connection
    const { data } = await supabase.from('profiles').select('count').limit(1);
    expect(data).toBeDefined();
  });

  afterEach(async () => {
    // Clean up subscriptions and test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await subscriptionManager.cleanup();
    await supabase.auth.signOut();
  });

  describe('Schedule Entry Real-time Updates', () => {
    it('receives real-time updates when schedule entries change', (done) => {
      const testUserId = `realtime-test-${Date.now()}`;
      const testDate = '2024-01-17';
      let updateReceived = false;

      // Create subscription for schedule updates
      const channel = supabase
        .channel(`schedule-updates-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedule_entries'
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new.date === testDate) {
              updateReceived = true;
              
              expect(payload.new).toEqual(
                expect.objectContaining({
                  user_id: expect.any(Number),
                  date: testDate,
                  value: 7
                })
              );

              // Clean up and complete test
              channel.unsubscribe();
              cleanup.testData.push({ type: 'schedule_entry', id: payload.new.id });
              done();
            }
          }
        )
        .subscribe();

      cleanup.channels.push(channel.topic);

      // Wait for subscription to be established, then insert test data
      setTimeout(async () => {
        // First create a test team member
        const { data: member } = await supabase
          .from('team_members')
          .insert({
            name: 'Realtime Test Member',
            team: 'Realtime Test Team',
            email: `realtime-${Date.now()}@example.com`,
            role: 'member'
          })
          .select()
          .single();

        if (member) {
          cleanup.testData.push({ type: 'team_member', id: member.id });

          // Insert schedule entry to trigger real-time update
          await supabase
            .from('schedule_entries')
            .insert({
              user_id: member.id,
              date: testDate,
              value: 7,
              absence_reason: null
            });
        }

        // Timeout if no update received
        setTimeout(() => {
          if (!updateReceived) {
            channel.unsubscribe();
            done.fail('Real-time update not received within timeout');
          }
        }, 8000);
      }, 1000);
    }, 15000);

    it('handles multiple concurrent real-time updates', (done) => {
      const updatesReceived = new Set();
      const expectedUpdates = 5;
      
      const channel = supabase
        .channel(`concurrent-updates-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedule_entries'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              updatesReceived.add(payload.new.id);
              cleanup.testData.push({ type: 'schedule_entry', id: payload.new.id });

              if (updatesReceived.size === expectedUpdates) {
                channel.unsubscribe();
                done();
              }
            }
          }
        )
        .subscribe();

      cleanup.channels.push(channel.topic);

      // Create concurrent updates
      setTimeout(async () => {
        // Create test team member first
        const { data: member } = await supabase
          .from('team_members')
          .insert({
            name: 'Concurrent Test Member',
            team: 'Concurrent Test Team',
            email: `concurrent-${Date.now()}@example.com`,
            role: 'member'
          })
          .select()
          .single();

        if (member) {
          cleanup.testData.push({ type: 'team_member', id: member.id });

          // Insert multiple schedule entries concurrently
          const promises = [];
          for (let i = 0; i < expectedUpdates; i++) {
            promises.push(
              supabase
                .from('schedule_entries')
                .insert({
                  user_id: member.id,
                  date: `2024-01-${String(17 + i).padStart(2, '0')}`,
                  value: 7,
                  absence_reason: null
                })
            );
          }

          await Promise.all(promises);
        }

        // Timeout if not all updates received
        setTimeout(() => {
          if (updatesReceived.size < expectedUpdates) {
            channel.unsubscribe();
            done.fail(`Only received ${updatesReceived.size}/${expectedUpdates} updates`);
          }
        }, 10000);
      }, 1000);
    }, 20000);
  });

  describe('Cross-Client Synchronization', () => {
    it('synchronizes updates between multiple clients', (done) => {
      const testDate = '2024-01-17';
      let client1UpdateReceived = false;
      let client2UpdateReceived = false;

      // Create two separate clients to simulate different users
      const client1 = createClient(supabaseUrl, supabaseAnonKey);
      const client2 = createClient(supabaseUrl, supabaseAnonKey);

      // Client 1 subscription
      const channel1 = client1
        .channel(`client1-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedule_entries'
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new.date === testDate) {
              client1UpdateReceived = true;
              checkCompletion();
            }
          }
        )
        .subscribe();

      // Client 2 subscription
      const channel2 = client2
        .channel(`client2-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedule_entries'
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new.date === testDate) {
              client2UpdateReceived = true;
              checkCompletion();
            }
          }
        )
        .subscribe();

      function checkCompletion() {
        if (client1UpdateReceived && client2UpdateReceived) {
          channel1.unsubscribe();
          channel2.unsubscribe();
          done();
        }
      }

      cleanup.channels.push(channel1.topic, channel2.topic);

      setTimeout(async () => {
        // Create test data
        const { data: member } = await supabase
          .from('team_members')
          .insert({
            name: 'Cross Client Test Member',
            team: 'Cross Client Test Team',
            email: `cross-client-${Date.now()}@example.com`,
            role: 'member'
          })
          .select()
          .single();

        if (member) {
          cleanup.testData.push({ type: 'team_member', id: member.id });

          // Insert initial schedule entry
          const { data: entry } = await supabase
            .from('schedule_entries')
            .insert({
              user_id: member.id,
              date: testDate,
              value: 7,
              absence_reason: null
            })
            .select()
            .single();

          if (entry) {
            cleanup.testData.push({ type: 'schedule_entry', id: entry.id });

            // Wait a moment, then update from client1
            setTimeout(async () => {
              await client1
                .from('schedule_entries')
                .update({ value: 3.5, absence_reason: 'Personal' })
                .eq('id', entry.id);
            }, 500);
          }
        }

        // Timeout if not all updates received
        setTimeout(() => {
          channel1.unsubscribe();
          channel2.unsubscribe();
          
          if (!client1UpdateReceived || !client2UpdateReceived) {
            done.fail(`Cross-client sync failed. Client1: ${client1UpdateReceived}, Client2: ${client2UpdateReceived}`);
          }
        }, 10000);
      }, 1000);
    }, 15000);

    it('handles subscription connection failures gracefully', (done) => {
      let connectionErrorHandled = false;

      // Create subscription with invalid configuration to trigger error
      const channel = supabase
        .channel(`error-test-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'nonexistent_schema',
            table: 'nonexistent_table'
          },
          () => {
            // Should not receive any updates
            done.fail('Should not receive updates from invalid subscription');
          }
        )
        .subscribe((status, error) => {
          if (status === 'SUBSCRIPTION_ERROR' || error) {
            connectionErrorHandled = true;
            channel.unsubscribe();
            done();
          }
        });

      cleanup.channels.push(channel.topic);

      // Timeout if error not handled
      setTimeout(() => {
        if (!connectionErrorHandled) {
          channel.unsubscribe();
          done.fail('Subscription error not handled within timeout');
        }
      }, 5000);
    }, 10000);
  });

  describe('Subscription Manager Integration', () => {
    it('manages multiple subscriptions efficiently', async () => {
      const subscriptionCount = 5;
      const subscriptions: string[] = [];

      // Create multiple subscriptions
      for (let i = 0; i < subscriptionCount; i++) {
        const subscriptionId = await subscriptionManager.subscribe(
          'schedule_entries',
          { event: '*' },
          (payload) => {
            // Handler for each subscription
          }
        );

        subscriptions.push(subscriptionId);
      }

      expect(subscriptions).toHaveLength(subscriptionCount);

      // Verify active subscriptions
      const activeSubscriptions = subscriptionManager.getActiveSubscriptions();
      expect(activeSubscriptions.size).toBe(subscriptionCount);

      // Clean up subscriptions
      for (const subId of subscriptions) {
        await subscriptionManager.unsubscribe(subId);
      }

      // Verify cleanup
      const remainingSubscriptions = subscriptionManager.getActiveSubscriptions();
      expect(remainingSubscriptions.size).toBe(0);
    });

    it('handles subscription cleanup on component unmount', async () => {
      const subscriptionId = await subscriptionManager.subscribe(
        'schedule_entries',
        { event: 'INSERT' },
        () => {}
      );

      expect(subscriptionManager.getActiveSubscriptions().has(subscriptionId)).toBe(true);

      // Simulate component unmount
      await subscriptionManager.cleanup();

      expect(subscriptionManager.getActiveSubscriptions().size).toBe(0);
    });

    it('recovers from connection interruptions', (done) => {
      let reconnected = false;

      const subscriptionId = subscriptionManager.subscribe(
        'schedule_entries',
        { event: '*' },
        (payload) => {
          // Handle updates
        },
        {
          onReconnect: () => {
            reconnected = true;
            subscriptionManager.unsubscribe(subscriptionId);
            expect(reconnected).toBe(true);
            done();
          }
        }
      );

      // Simulate connection interruption (this would typically be handled by Supabase)
      setTimeout(() => {
        // Force reconnection
        subscriptionManager.forceReconnect();
      }, 2000);

      // Timeout if reconnection doesn't occur
      setTimeout(() => {
        if (!reconnected) {
          subscriptionManager.unsubscribe(subscriptionId);
          done.fail('Reconnection not detected within timeout');
        }
      }, 10000);
    }, 15000);
  });

  describe('Real-time Calculations', () => {
    it('updates team calculations in real-time', (done) => {
      let calculationUpdated = false;

      // Set up real-time team calculations
      const cleanup = realTimeTeamCalculations.setup('Test Team', (calculations) => {
        if (calculations.totalHours > 0) {
          calculationUpdated = true;
          
          expect(calculations).toEqual(
            expect.objectContaining({
              totalHours: expect.any(Number),
              completionPercentage: expect.any(Number),
              teamMembers: expect.any(Array)
            })
          );

          realTimeTeamCalculations.cleanup();
          done();
        }
      });

      setTimeout(async () => {
        // Create test data to trigger calculation update
        const { data: member } = await supabase
          .from('team_members')
          .insert({
            name: 'Calculation Test Member',
            team: 'Test Team',
            email: `calculation-${Date.now()}@example.com`,
            role: 'member'
          })
          .select()
          .single();

        if (member) {
          cleanup.testData.push({ type: 'team_member', id: member.id });

          // Insert schedule entry to trigger calculation
          const { data: entry } = await supabase
            .from('schedule_entries')
            .insert({
              user_id: member.id,
              date: '2024-01-17',
              value: 7,
              absence_reason: null
            })
            .select()
            .single();

          if (entry) {
            cleanup.testData.push({ type: 'schedule_entry', id: entry.id });
          }
        }

        // Timeout if calculation not updated
        setTimeout(() => {
          if (!calculationUpdated) {
            realTimeTeamCalculations.cleanup();
            done.fail('Real-time calculation update not received');
          }
        }, 8000);
      }, 1000);
    }, 15000);

    it('handles calculation errors gracefully', () => {
      expect(() => {
        realTimeTeamCalculations.setup('Nonexistent Team', (calculations) => {
          // Should handle error gracefully
        });
      }).not.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    it('handles high-frequency updates efficiently', (done) => {
      const updateCount = 20;
      const receivedUpdates = new Set();
      const startTime = performance.now();

      const channel = supabase
        .channel(`high-freq-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedule_entries'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              receivedUpdates.add(payload.new.id);
              cleanup.testData.push({ type: 'schedule_entry', id: payload.new.id });

              if (receivedUpdates.size === updateCount) {
                const endTime = performance.now();
                const duration = endTime - startTime;

                // Should handle updates efficiently (adjust threshold based on requirements)
                expect(duration).toBeLessThan(10000); // 10 seconds
                
                channel.unsubscribe();
                done();
              }
            }
          }
        )
        .subscribe();

      cleanup.channels.push(channel.topic);

      setTimeout(async () => {
        // Create test member
        const { data: member } = await supabase
          .from('team_members')
          .insert({
            name: 'High Freq Test Member',
            team: 'High Freq Test Team',
            email: `high-freq-${Date.now()}@example.com`,
            role: 'member'
          })
          .select()
          .single();

        if (member) {
          cleanup.testData.push({ type: 'team_member', id: member.id });

          // Generate high-frequency updates
          const promises = [];
          for (let i = 0; i < updateCount; i++) {
            promises.push(
              supabase
                .from('schedule_entries')
                .insert({
                  user_id: member.id,
                  date: `2024-01-${String((i % 31) + 1).padStart(2, '0')}`,
                  value: Math.floor(Math.random() * 8),
                  absence_reason: null
                })
            );
          }

          await Promise.all(promises);
        }

        // Timeout if not all updates received
        setTimeout(() => {
          if (receivedUpdates.size < updateCount) {
            channel.unsubscribe();
            done.fail(`Only received ${receivedUpdates.size}/${updateCount} high-frequency updates`);
          }
        }, 15000);
      }, 1000);
    }, 25000);

    it('maintains connection stability under load', (done) => {
      const subscriptions: any[] = [];
      const maxSubscriptions = 10;
      let connectionsStable = true;

      // Create multiple subscriptions
      for (let i = 0; i < maxSubscriptions; i++) {
        const channel = supabase
          .channel(`load-test-${i}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'schedule_entries'
            },
            () => {
              // Handle updates
            }
          )
          .subscribe((status, error) => {
            if (status === 'SUBSCRIPTION_ERROR' || error) {
              connectionsStable = false;
            }
          });

        subscriptions.push(channel);
        cleanup.channels.push(channel.topic);
      }

      // Monitor connection stability
      setTimeout(() => {
        // Clean up subscriptions
        subscriptions.forEach(channel => channel.unsubscribe());

        expect(connectionsStable).toBe(true);
        done();
      }, 5000);
    }, 10000);
  });

  // Helper function to clean up test data
  async function cleanupTestData() {
    try {
      // Unsubscribe from all channels
      cleanup.channels.forEach(topic => {
        // Note: This is a simplified cleanup - real implementation may vary
      });
      cleanup.channels = [];

      // Clean up test data
      for (const item of cleanup.testData) {
        switch (item.type) {
          case 'schedule_entry':
            await supabase
              .from('schedule_entries')
              .delete()
              .eq('id', item.id);
            break;
          case 'team_member':
            await supabase
              .from('team_members')
              .delete()
              .eq('id', item.id);
            break;
        }
      }
      cleanup.testData = [];

    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }
});