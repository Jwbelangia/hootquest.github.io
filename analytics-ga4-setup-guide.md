# HootQuest GA4 Setup Guide

## Purpose
This guide covers the optional GA4 setup that makes the new HootQuest tracking easier to read in reports and explorations.

Use this together with `analytics-event-map.md`.

## Not Required for Tracking
The site events already send to GA4 without this setup.

This guide is only for making reports easier to understand.

## Recommended GA4 Custom Definitions
Create these as event-scoped custom dimensions in GA4.

### Event-scoped custom dimensions
1. `event_category`
- Use for grouping interactions such as `hero`, `support_modal`, `campaign_story`, `kickstarter_tune_in`, `footer_social`, `roadmap`, and `cart`

2. `modal_name`
- Use for modal reporting
- Examples: `support_modal`, `campaign_story_modal`, `hero_modal`, `figurine_modal`, `payment_modal`

3. `modal_state`
- Helps split modal opens vs closes
- Values: `open`, `close`

4. `form_name`
- Distinguishes newsletter forms
- Examples: `kickstarter_tune_in_main`, `kickstarter_tune_in_footer`

5. `submission_status`
- Distinguishes form states
- Values: `submit`, `success`

6. `destination`
- Helps identify where a CTA sends the visitor
- Examples: `kickstarter_tune_in`, `order_request_center`

7. `deck_name`
- Helps analyze owl vs rat interest
- Values: `owls`, `rats`

8. `content_name`
- For reveal and content visibility events
- Example: `live_roadmap`

9. `product_id`
- For hero figurine add-to-cart actions
- Example: `hero-rogue`

10. `selected_items`
- For figurine picker submissions
- Example: `figurine-rogue:1|figurine-mage:2`

## Optional Custom Metrics
These are usually not necessary yet.

If needed later, you can rely on built-in event counts instead of creating custom metrics.

## Suggested Conversions
Mark these as key events if they match your business goals.

### Recommended key events
- `newsletter_submission`
  - Best used with a filter or audience based on `submission_status=success`
- `cart_add`
  - Useful for measuring product interest before full checkout is mature

### Optional key events
- `signup_scroll`
  - Useful only if reaching the Tune-In section is a major goal
- `cta_click`
  - Usually too broad to mark globally as a key event

## Suggested Reports

### 1. Top CTA report
Use an Exploration or custom detail report with:
- Dimension: `event_label`
- Secondary dimension: `event_category`
- Metric: Event count
- Filter: `event_name` exactly matches `cta_click`

Use this to see which homepage CTA names are driving the most action.

### 2. Modal engagement report
Use:
- Dimension: `modal_name`
- Secondary dimension: `modal_state`
- Metric: Event count
- Filter: `event_name` exactly matches `modal_state_change`

Use this to compare modal opens and closes.

### 3. Signup intent report
Use:
- Dimension: `event_name`
- Secondary dimension: `event_label` or `form_name`
- Metric: Event count
- Filter: include `signup_scroll`, `newsletter_cta_click`, and `newsletter_submission`

Use this to measure how often visitors move from CTA click to signup interaction.

### 4. Newsletter success report
Use:
- Dimension: `form_name`
- Secondary dimension: `submission_status`
- Metric: Event count
- Filter: `event_name` exactly matches `newsletter_submission`

Use this to compare submit attempts and successful iframe completions.

### 5. Deck interest report
Use:
- Dimension: `deck_name`
- Metric: Event count
- Filter: `event_name` exactly matches `deck_switch`

Use this to understand whether visitors interact more with the owl or rat deck.

### 6. Product interest report
Use:
- Dimension: `product_id`
- Secondary dimension: `selected_items`
- Metric: Event count
- Filter: `event_name` exactly matches `cart_add`

Use this to see which figurines or hero items get attention.

## Suggested Funnel Explorations

### Funnel 1: Homepage CTA to newsletter success
Suggested steps:
1. `cta_click`
2. `signup_scroll`
3. `newsletter_cta_click`
4. `newsletter_submission` where `submission_status=success`

This is the clearest early funnel for campaign interest.

### Funnel 2: Story/support modal to signup success
Suggested steps:
1. `modal_state_change` where `modal_name` is `support_modal` or `campaign_story_modal` and `modal_state=open`
2. `signup_scroll`
3. `newsletter_submission` where `submission_status=success`

Use this to see whether the modals are helping convert interest into signups.

### Funnel 3: Product curiosity to order center
Suggested steps:
1. `modal_state_change` where `modal_name=hero_modal` and `modal_state=open`
2. `cart_add`
3. Landing interaction around the order section if expanded later

This is useful for product-interest analysis even before a full checkout funnel exists.

## Recommended Naming Practice
Keep event names stable and only refine labels when necessary.

Stable event names help preserve reporting continuity over time.

## When to Expand Tracking Later
Add more events only if you need one of these:
- outbound link tracking beyond Facebook
- scroll depth milestones
- iframe interaction tracking inside embedded roadmap or game experiences
- full checkout/order completion analytics
- campaign-source attribution for paid traffic

## Practical Next Step in GA4
If you only do one setup task now, create these event-scoped custom dimensions first:
- `event_category`
- `modal_name`
- `modal_state`
- `form_name`
- `submission_status`
- `destination`

That will make the current HootQuest tracking much easier to read without changing the site again.
