# HootQuest Analytics Event Map

## Google Analytics Event Names

### cta_click
- `hero_support_owlcrest` - Hero button that opens the Support HootQuest modal
- `hero_learn_our_story` - Hero button that opens the Story & Campaign modal
- `support_modal_sign_up_to_tune_in` - Support modal button that scrolls to the middle-page Kickstarter Tune-In section
- `campaign_story_support_the_campaign` - Story modal button that scrolls to the middle-page Kickstarter Tune-In section
- `scroll_to_order_request_center` - Cart/order CTA that scrolls to the order request center
- `open_owlcrest-collectible` - Order center button that opens the figurine picker modal

### modal_state_change
- `support_hootquest` - Support modal opened or closed
- `campaign_story` - Story & Campaign modal opened or closed
- `owlcrest_medium_figurine` - Figurine modal opened or closed
- `hero product id` - Hero modal opened or closed for a specific hero figurine
- `venmo` / `paypal` - Payment modal opened or closed for the selected method

Additional parameters:
- `modal_name`
- `modal_state`

### signup_scroll
- Fires when a tracked CTA scrolls the visitor to `#kickstarter-tune-in`
- Label uses the source CTA label when available

Additional parameters:
- `destination=kickstarter_tune_in`

### newsletter_cta_click
- `kickstarter_tune_in_notify_me` - Main middle-page Tune-In submit button
- `footer_kickstarter_tune_in_submit` - Footer signup submit button

### newsletter_submission
- `kickstarter_tune_in_main` - Main middle-page form submit/success
- `kickstarter_tune_in_footer` - Footer form submit/success

Additional parameters:
- `form_name`
- `submission_status` (`submit` or `success`)

### social_click
- `facebook_follow` - Footer Facebook link click

### content_reveal
- `live_roadmap_revealed` - Live roadmap section became visible

Additional parameters:
- `content_name=live_roadmap`

### deck_switch
- `owls` - Switched to owl deck
- `rats` - Switched to rat deck

Additional parameters:
- `deck_name`

### cart_add
- Hero modal add-to-cart uses the selected `product_id`
- Figurine modal add-to-cart uses a pipe-delimited `selected_items` list such as `figurine-rogue:1|figurine-mage:2`

Additional parameters:
- `destination=order_request_center`
- `product_id` or `selected_items`

## Common Parameters Added to All Tracked Events
- `page_location`
- `page_path`
- `page_title`
- `event_category`
- `event_label`
- `interaction_type` when the event comes from a tracked element

## Notes
- Tracking was added without changing visitor-facing visuals or interaction flow.
- Most click labels come from `data-analytics-label` in `index.html`.
- If you want cleaner GA reporting later, create custom dimensions for `event_category`, `modal_name`, `modal_state`, `form_name`, `submission_status`, `destination`, and `deck_name`.
