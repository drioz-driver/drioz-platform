export const siteUrl='https://www.drioz.com';
export type SeoPage={section:string;slug:string;title:string;description:string;intro:string;blocks:string[][];faqs:string[][];audience?:'partner';indexable?:boolean};
export const seoPages:SeoPage[]=[
  {
    "section": "drivers",
    "slug": "hyderabad",
    "title": "Hire a Driver in Hyderabad for Your Own Car",
    "description": "Plan a DRIOZ driver booking in Hyderabad for city drops, round trips or outstation travel. Review your fare and check driver availability before confirming.",
    "intro": "Keep your own car for the journey and let someone else take the wheel. DRIOZ lets you request a personal driver in Hyderabad for a one-way drop, a round trip with stops, or a scheduled journey outside the city.",
    "blocks": [
      [
        "Choose the trip around your day",
        "A trip from Madhapur to a meeting in the Financial District has different needs from a day of appointments across the city. Choose one way when you only need a drop. Choose a round trip when the driver should stay with you and bring you back. Enter the actual addresses in the booking form so the estimate reflects your plan."
      ],
      [
        "Planning an airport journey",
        "For a journey to or from Rajiv Gandhi International Airport, remember that this is a driver for your own car, rather than a taxi with a vehicle included. Decide who brings the car to the pickup point, enter the terminal or meeting point clearly, and leave time for traffic. Parking and tolls are separate from the driver fare."
      ],
      [
        "Pickup details that make a difference",
        "At an apartment, office campus or hotel, include a usable meeting point and keep access instructions ready. If the address search shows more than one place with a similar name, select the correct suggestion before reviewing your estimate. Pick the right transmission and car category for your vehicle."
      ],
      [
        "Check availability before making firm plans",
        "Neighbourhood examples describe journey planning, not guaranteed coverage. Driver availability depends on your pickup, requested time and approved partners nearby. A request is confirmed when a driver accepts. Use the live booking flow for the current estimate; there is no fixed fare promised on this page."
      ]
    ],
    "faqs": [
      [
        "Can I book in Madhapur or Gachibowli?",
        "Enter your exact pickup in the booking form to check current service availability. A neighbourhood being mentioned here does not guarantee an available driver."
      ],
      [
        "Does DRIOZ provide the car?",
        "No. These bookings are for a driver to drive your own car."
      ],
      [
        "Can I request an automatic-car driver?",
        "Select Automatic and the correct car category in the booking form so the request reflects your vehicle."
      ]
    ]
  },
  {
    "section": "services",
    "slug": "one-way-drivers",
    "title": "Book a One-Way Driver for Your Own Car",
    "description": "Need a driver for a single journey? Learn how DRIOZ one-way bookings work, what to check before requesting, and when a round trip is a better fit.",
    "intro": "A one-way driver booking is for a single journey in your own car. It is useful when you need to reach a destination but do not need the driver to wait and bring you back.",
    "blocks": [
      [
        "When one way fits",
        "Consider one way for a drop across town, reaching an event, or taking your car home after a long day. The important distinction is the end of the booking: the driver finishes at the destination rather than staying for a return journey."
      ],
      [
        "Your car arrives with you",
        "A driver-only booking is different from booking a cab. You supply the car, and the driver handles the driving for the agreed journey. Plan where the vehicle will be parked at the destination and who will use it next."
      ],
      [
        "What to enter before you request",
        "Choose One Way, select your pickup and drop from the address suggestions, and set the time and vehicle details. Review the current estimate before signing in and confirming. Driver assignment still depends on a partner accepting the request."
      ],
      [
        "If your plans include waiting or several stops",
        "A round trip may fit better when you want the same driver throughout an outing. Compare the trip types before requesting rather than assuming a one-way drop includes waiting time. Review any change with support if your plans change after booking."
      ]
    ],
    "faqs": [
      [
        "Is fuel included?",
        "You supply and fuel your own car. The booking estimate is for the driver service; review its breakdown and any separate tolls or parking."
      ],
      [
        "Does one way include a return journey?",
        "No. Choose a round trip if you need the driver to stay and bring you back."
      ],
      [
        "Is the displayed estimate a guarantee of a driver?",
        "No. Review the fare and submit your request; availability is confirmed when a driver accepts."
      ]
    ]
  },
  {
    "section": "services",
    "slug": "round-trip-drivers",
    "title": "Round-Trip Drivers for Errands, Meetings and Return Journeys",
    "description": "Keep a DRIOZ driver for an outing in your own car. Understand round-trip planning, waiting time, vehicle details and fare checks before booking.",
    "intro": "Choose a round trip when your outing includes a return journey and you need a driver to stay with you. Your own car remains with you while you attend appointments, meet people or complete errands.",
    "blocks": [
      [
        "Plan the whole outing",
        "Think about the time from pickup to your final return, including meetings, shopping and waiting. A route that takes a short time to drive can still be a longer booking if you spend time at each stop. Use the package and scheduling options shown in the current booking flow."
      ],
      [
        "Useful for a day with several commitments",
        "A round trip can suit medical appointments, office meetings in different locations or a family outing. Give clear pickup details and discuss the intended stops with the assigned driver. Avoid treating an estimated arrival time as a promise when traffic or waiting is uncertain."
      ],
      [
        "Check the estimate and extra usage",
        "Review what your selected package covers before confirming. Extra time, tolls and parking can affect the final amount. Keep the planned duration realistic, and contact support when your itinerary changes rather than assuming additional usage is free."
      ],
      [
        "Choose a different trip type when needed",
        "If you only need a drop, one way is usually the more relevant booking type. For a journey outside the city, review the outstation options instead. Choosing the right type helps communicate the work being requested to a driver."
      ]
    ],
    "faqs": [
      [
        "Can I make stops?",
        "Plan your stops and waiting within the selected booking. Review the package conditions and discuss route details with the assigned driver."
      ],
      [
        "What if the outing takes longer?",
        "Additional usage may change the final amount. Check the estimate and applicable terms before booking, and contact support if plans change."
      ],
      [
        "Will DRIOZ provide a different car?",
        "No. The service is a driver for your own car."
      ]
    ]
  },
  {
    "section": "services",
    "slug": "outstation-drivers",
    "title": "Outstation Drivers for Journeys in Your Own Car",
    "description": "Plan an outstation driver request with DRIOZ. Check scheduling, vehicle preparation, trip duration, tolls and return arrangements before you book.",
    "intro": "For a journey beyond the city, an outstation booking lets you travel in your own car with a personal driver. Schedule ahead and review the full plan, including the return arrangement, before requesting.",
    "blocks": [
      [
        "Set the destination and the return plan",
        "A highway trip needs more planning than a city drop. Decide whether the car and driver are returning with you, identify overnight stops if any, and choose the relevant direction and duration options in the booking form. Do not assume an outstation one-way request includes the driver's return arrangements."
      ],
      [
        "Prepare the vehicle",
        "Check tyres, fuel, documents, lights and any known issues before departure. Enter the correct transmission and vehicle category. A driver booking does not replace the vehicle owner's responsibility to keep the car roadworthy and ready for the journey."
      ],
      [
        "Budget beyond the driver estimate",
        "The driver fare is only part of the trip budget. Fuel, tolls, parking and permits may be separate. For a long or overnight itinerary, confirm food, rest and accommodation arrangements with support before committing; this page does not promise that those costs are included."
      ],
      [
        "Allow time for acceptance and safe breaks",
        "Schedule outstation travel in advance rather than relying on immediate availability. The request becomes confirmed when a driver accepts. Build appropriate rest breaks into a long itinerary and review changes with support if the route or duration changes."
      ]
    ],
    "faqs": [
      [
        "Can I book an outstation driver immediately?",
        "Use the scheduling options in the booking flow. Outstation requests should be planned in advance and remain subject to availability."
      ],
      [
        "Are tolls and fuel included?",
        "Do not assume they are included. You provide your car and fuel; review the estimate and separate trip expenses before confirming."
      ],
      [
        "Can I book a multi-day trip?",
        "Check the duration options currently offered and confirm your full itinerary and overnight arrangements with support."
      ]
    ]
  },
  {
    "section": "guides",
    "slug": "one-way-vs-round-trip",
    "title": "One-Way vs Round-Trip Driver: Which Should You Book?",
    "description": "Compare one-way, round-trip and outstation driver bookings for your own car, with practical examples and a checklist before you request.",
    "intro": "Choose the booking type around what you need the driver to do after the first arrival. That is usually a clearer guide than the distance alone.",
    "blocks": [
      [
        "One way: the driver finishes at the drop",
        "If you need to reach a destination with your car and the driver can leave afterwards, choose one way. For example, you may be going to an event and arranging the return separately. Check where the car will remain after the booking."
      ],
      [
        "Round trip: keep the driver for the outing",
        "If you need someone to wait during an appointment and drive you back, choose a round trip. Include the time spent waiting when considering the booking duration. An outing with several short drives can take longer than one continuous journey."
      ],
      [
        "Outstation: plan the longer journey explicitly",
        "When your destination is outside the city, review outstation rather than trying to fit the journey into a city booking. Set a schedule, the intended duration and the return plan. Consider vehicle preparation, breaks and overnight arrangements."
      ],
      [
        "Compare the actual estimate, not a headline price",
        "Two bookings with the same pickup may have different costs because of time, route, trip type or applicable charges. Enter your real plan and review the live estimate. If the plan changes after confirmation, check the effect with support."
      ]
    ],
    "faqs": [
      [
        "Can I compare prices before booking?",
        "Enter the trip details and review the estimate before confirming your request."
      ],
      [
        "Does a short distance always mean one way?",
        "No. Waiting and the need for a return journey matter too."
      ],
      [
        "Does choosing a trip type guarantee availability?",
        "No. Driver acceptance is still required."
      ]
    ]
  },
  {
    "section": "guides",
    "slug": "booking-a-driver",
    "title": "Book a Driver Online: How DRIOZ Bookings Work",
    "description": "A practical guide to requesting a DRIOZ driver: select addresses, choose a trip type, review the fare, confirm and prepare for pickup.",
    "intro": "DRIOZ is for journeys in your own car. Before requesting, have your pickup, destination, timing and vehicle details ready so the estimate and request match the trip you intend to take.",
    "blocks": [
      [
        "1. Choose a usable pickup and destination",
        "Select matching addresses from the suggestions rather than leaving an ambiguous place name. Check the selected location on the map where shown. Keep building access, gate or terminal details ready for your assigned driver."
      ],
      [
        "2. Match the trip and vehicle",
        "Choose one way for a drop, round trip for an outing with a return, or outstation for travel beyond the city. Select Manual or Automatic and the car category. Use the scheduling options if you need the driver later."
      ],
      [
        "3. Review the estimate and confirm your request",
        "Read the fare breakdown, timing and applicable extra charges. Sign in when prompted and review the details before confirming. An estimate does not reserve a driver; your request needs to be accepted by an available partner."
      ],
      [
        "4. Prepare for pickup and follow the trip",
        "Have your car ready and use the contact or status options provided after assignment. When a trip start code is shown, share it when you meet the assigned driver and are ready to start. Use booking support for questions or changed plans."
      ]
    ],
    "faqs": [
      [
        "Can I see an estimate before signing in?",
        "The public booking form lets you enter your trip and review an estimate. Sign-in is required to confirm the request."
      ],
      [
        "What should I do if no driver is available?",
        "Check another suitable time or contact support. Do not assume a submitted request means the trip is confirmed."
      ],
      [
        "Where do I get help?",
        "Use the support options in DRIOZ or contact info@drioz.com."
      ]
    ]
  },
  {
    "section": "drivers",
    "slug": "jobs",
    "title": "Driver Jobs in Hyderabad: Apply as a DRIOZ Partner",
    "description": "Explore DRIOZ driver-partner opportunities in Hyderabad. Learn about registration, licence and document review, approval and how ride requests work.",
    "intro": "Looking for driver work in Hyderabad? Apply to become a DRIOZ partner and drive customers in their own cars. Registration starts an application for review; it is not an offer of employment or a promise of bookings.",
    "blocks": [
      [
        "What the work involves",
        "DRIOZ connects approved driver partners with requests to drive a customer's car. Requests may be for a city drop, a round trip or an outstation journey. Review the trip information, vehicle type and estimated partner fare before accepting work that fits your availability and experience."
      ],
      [
        "Prepare your application",
        "Create a partner account and complete the registration details requested in the portal. Have a current driving licence and the required identity documents ready. Enter accurate contact details, the city where you want to work and your licence expiry date so the review team can assess your application."
      ],
      [
        "Approval comes before receiving work",
        "Submitting an application does not immediately activate driver access. The team reviews the profile and required documents before approval. Follow the portal for the current status and any requests for additional information. There is no guaranteed approval date published on this page."
      ],
      [
        "Understand earnings and availability",
        "Actual earnings depend on accepted and completed trips, demand, your availability and the applicable deductions and settlement rules. Review the wallet and earnings information in your account. DRIOZ does not promise a fixed monthly salary, a minimum number of rides or that registration guarantees work."
      ],
      [
        "Start with the official partner portal",
        "Use the application link on this page to reach DRIOZ Partner registration. For questions about your application, contact info@drioz.com. Do not treat a third-party earnings claim as a DRIOZ commitment."
      ]
    ],
    "faqs": [
      [
        "Do I need to own a car?",
        "The advertised DRIOZ service is driving a customer's car. Review the current partner requirements in the application portal."
      ],
      [
        "Will I receive a fixed salary?",
        "This page describes partner opportunities, not a salaried vacancy. Earnings depend on actual work and the applicable partner terms."
      ],
      [
        "Can I start immediately after registration?",
        "No. Your application and required documents must be reviewed and approved first."
      ]
    ],
    "audience": "partner"
  },
  {
    "section": "drivers",
    "slug": "madhapur-hitech-city",
    "title": "Drivers in Madhapur and HITEC City, Hyderabad",
    "description": "Plan a personal driver booking around Madhapur, HITEC City and nearby Hyderabad office districts. Get pickup, parking and trip-type guidance before requesting.",
    "intro": "Need a driver for your own car around Madhapur or HITEC City? Start with the exact pickup and the kind of journey you need. DRIOZ supports requests for one-way, round-trip and scheduled outstation travel, subject to approved-driver availability.",
    "blocks": [
      [
        "Office-campus pickups need a meeting point",
        "For an office pickup, use the actual building entrance rather than only the campus name. Keep the gate, tower and visitor-access instructions ready for the assigned driver. If the car is in a basement or a restricted parking area, agree on a practical meeting point before the driver arrives."
      ],
      [
        "Madhapur to Financial District: drop or return?",
        "A drop at a meeting is a one-way use case if the driver can finish there. If you need the driver to wait and bring you back, plan a round trip and include the meeting time in the duration. A short distance does not mean a short booking when waiting is involved."
      ],
      [
        "HITEC City outings and airport travel",
        "For an evening outing, decide where your car needs to end the journey before choosing the trip type. For a journey to Rajiv Gandhi International Airport, enter the terminal or meeting point clearly, allow for road traffic and keep toll and parking costs separate from the driver estimate. DRIOZ provides the driver, not a vehicle."
      ],
      [
        "Choose a precise map suggestion",
        "Madhapur and HITEC City place names can appear in several address suggestions. Pick the entry that matches your building and check the location shown. If you are arranging the trip for a family member or colleague, make sure they can meet the assigned driver at that pickup."
      ],
      [
        "Availability and pricing",
        "Area names on this page describe trip planning rather than guaranteed coverage at every gate or time. The booking form checks your pickup and displays the current estimate. A request is confirmed only when a driver accepts; this page promises neither a fixed arrival time nor a fixed local price."
      ]
    ],
    "faqs": [
      [
        "Can I request a driver near Cyber Towers?",
        "Use the exact pickup address and a clear meeting point. Availability depends on approved partners and the requested time."
      ],
      [
        "Is a car included?",
        "No. The driver drives your car, so have the vehicle ready at the pickup point."
      ],
      [
        "Can I arrange a driver after work?",
        "Choose your intended time in the booking flow and review the current estimate. Do not treat the request as confirmed until a driver accepts."
      ]
    ]
  },
  {
    "section": "drivers",
    "slug": "bangalore",
    "title": "DRIOZ in Bengaluru (Bangalore): Availability and Trip Planning",
    "description": "Check DRIOZ's Bengaluru launch status and plan driver-only travel in your own car. Information for customers and prospective driver partners.",
    "intro": "Bengaluru, also commonly searched as Bangalore, is configured in DRIOZ. At our 1 November 2026 operations check, there were no approved driver partners registered for the city. Immediate service is therefore not being advertised here.",
    "indexable": false,
    "blocks": [
      [
        "Check the city before planning around a booking",
        "A city appearing in a selector is not the same as an active driver being available. Use the live booking form for the current status, and do not rely on DRIOZ for a time-sensitive departure until your request is accepted. This page is a planning and launch-status guide, not a promise of coverage."
      ],
      [
        "Plan office travel around the full outing",
        "A journey between an office district and home can involve more than the time spent driving. Decide whether you need only a drop or a driver who stays through appointments and brings you back. For pickup from an office park, prepare building, gate and parking instructions."
      ],
      [
        "Airport journeys require the car to be in the right place",
        "A driver-only service does not bring a cab to the terminal. For travel to or from Kempegowda International Airport, work out who brings your own car to the pickup, how you will meet, where it can wait and who pays parking and tolls. Allow time for traffic and the pickup process."
      ],
      [
        "Interested in becoming a Bengaluru partner?",
        "Use DRIOZ Partner registration to submit the city and required licence and profile details. Application review and approval are required before driving. Registration does not guarantee work, earnings or a city launch date."
      ]
    ],
    "faqs": [
      [
        "Can I book a Bengaluru driver now?",
        "Do not assume availability. Our last operations check found no approved city partners. Check the live booking flow for changes."
      ],
      [
        "Is Bangalore different from Bengaluru in DRIOZ?",
        "They refer to the same city. The configured city name in DRIOZ is Bengaluru."
      ],
      [
        "Can I apply to drive in Bengaluru?",
        "Use the partner registration portal and select the appropriate city. The application is subject to review."
      ]
    ]
  },
  {
    "section": "drivers",
    "slug": "delhi",
    "title": "DRIOZ in Delhi NCR: Availability and Driver Booking Guide",
    "description": "Read DRIOZ's Delhi NCR launch status and practical guidance for driver-only journeys, cross-city travel and partner registration.",
    "intro": "Delhi NCR is configured in DRIOZ, but our 1 November 2026 operations check found no approved driver partners registered for the city. This guide does not advertise immediate availability or guaranteed coverage across NCR.",
    "indexable": false,
    "blocks": [
      [
        "NCR is a region, so use a complete address",
        "A general destination such as Delhi or NCR is not enough to describe a pickup. Be clear about the locality, building, meeting point and whether the journey crosses into another city. Check that the map suggestion reflects your actual address before relying on an estimate."
      ],
      [
        "Separate a local drop from a longer itinerary",
        "A single drop, an outing with waiting and return, and a journey beyond the city involve different driver requirements. Enter the whole plan and select the appropriate trip type. Do not assume a local booking covers an extended multi-stop or intercity itinerary."
      ],
      [
        "Terminal pickups need a vehicle plan",
        "For an airport or railway pickup, remember that DRIOZ's advertised service is a driver for your own car. Agree on how the vehicle reaches the pickup, the correct terminal or station exit, and a legal meeting and parking arrangement. Check separate toll, parking and permit costs."
      ],
      [
        "Vehicle readiness and local restrictions",
        "Keep your own car's documents and condition suitable for the intended route. Check current official traffic, vehicle and access restrictions before travel, rather than relying on a booking page as legal guidance. A driver request does not override those restrictions."
      ],
      [
        "Partner registration and current launch status",
        "Prospective Delhi NCR driver partners can begin registration through the official DRIOZ portal. Required documents and the application must be reviewed and approved. No salary, minimum booking volume or launch date is promised. Customers should confirm live availability before arranging travel around DRIOZ."
      ]
    ],
    "faqs": [
      [
        "Does DRIOZ guarantee a driver in Delhi NCR?",
        "No. Our latest operations check found no approved city partners. Check the live booking flow before planning a journey."
      ],
      [
        "Can I use a driver for my own car?",
        "That is the service DRIOZ is designed for; a vehicle is not included."
      ],
      [
        "How can Delhi NCR drivers apply?",
        "Use DRIOZ Partner registration, select the city and provide the required information for review."
      ]
    ]
  }
];
