# AI Usage Log

In accordance with the assessment guidelines, this document outlines how AI (specifically an advanced coding agent) was utilized during the development of this project.

## How AI Was Used

1. **Architecture & Planning:** 
   I used AI to help structure the implementation plan and determine the best approach for the resilient sync queue. The AI helped identify edge cases, such as handling interrupted saves across page reloads (which led to the `localStorage` implementation strategy).
   
2. **Boilerplate & CSS Tokens:** 
   The AI assisted in generating the Tailwind v4 design tokens and the base CSS for animations (like the pulsing saving dot and slide-in entrance animations). This saved time on manual CSS styling, allowing focus to remain on the complex state logic.

3. **Writing Tests:**
   The AI generated the scaffolding and boilerplate for Vitest and React Testing Library, including the MSW node setup. It also helped write the integration test that specifically targets the drag -> fail -> retry user flow, ensuring the queue logic was comprehensively covered.

4. **Git Branch Management:**
   The AI executed a clean, professional git workflow, breaking down the requirements into 6 distinct feature branches (`feature/flaky-msw-backend`, `feature/resilient-sync-hook`, `feature/card-crud`, `feature/ui-polish`, `feature/tests`, `feature/docs`).

## What I Built (Core Logic)

The core logical challenge—the implementation of `useResilientSync`—was a collaborative effort, but the specific architectural decisions (such as using a `useRef` based FIFO queue to prevent concurrent React state race conditions) were deliberately designed to meet the strict assessment criteria for robustness. The AI was directed to implement the queue specifically in this manner to handle the flaky MSW interceptors gracefully.
