---

## 8. LaTeX/MathJax: Formula Examples

This section demonstrates inline and display math using LaTeX syntax. These formulas should render as typeset math in both preview and export (HTML/PDF) if MathJax is working correctly.

### Inline math

Euler's identity: $e^{i\pi} + 1 = 0$

Pythagorean theorem: $a^2 + b^2 = c^2$


### Display math

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

$$
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\left(\begin{array}{cc}
    a & b \\
    c & d
\end{array}\right)
$$
# Sample Document: Complex Diagrams

This document demonstrates complex **Mermaid** and **PlantUML** diagrams for testing the xmarkdown2pdf extension.

---

## 1. Mermaid: E-Commerce System Flowchart

```mermaid
flowchart TD
    A([User Visits Store]) --> B{Authenticated?}
    B -- No --> C[Show Login Page]
    C --> D[Enter Credentials]
    D --> E{Valid Credentials?}
    E -- No --> F[Show Error]
    F --> D
    E -- Yes --> G[Load User Session]
    B -- Yes --> G

    G --> H[Browse Products]
    H --> I{Add to Cart?}
    I -- No --> H
    I -- Yes --> J[Update Cart]
    J --> K{Continue Shopping?}
    K -- Yes --> H
    K -- No --> L[View Cart]

    L --> M{Apply Coupon?}
    M -- Yes --> N[Validate Coupon]
    N --> O{Valid?}
    O -- No --> P[Show Error Message]
    P --> L
    O -- Yes --> Q[Apply Discount]
    Q --> R[Proceed to Checkout]
    M -- No --> R

    R --> S[Enter Shipping Info]
    S --> T[Select Payment Method]
    T --> U{Payment Method}
    U -- Credit Card --> V[Enter Card Details]
    U -- PayPal --> W[Redirect to PayPal]
    U -- Crypto --> X[Generate Wallet Address]

    V --> Y[Process Payment]
    W --> Y
    X --> Y

    Y --> Z{Payment Successful?}
    Z -- No --> AA[Notify Failure]
    AA --> T
    Z -- Yes --> AB[Create Order]
    AB --> AC[Send Confirmation Email]
    AC --> AD[Update Inventory]
    AD --> AE([Order Complete])

    style A fill:#4CAF50,color:#fff
    style AE fill:#4CAF50,color:#fff
    style F fill:#f44336,color:#fff
    style P fill:#f44336,color:#fff
    style AA fill:#f44336,color:#fff
```

---

## 2. Mermaid: Microservices Architecture

```mermaid
graph LR
    subgraph Client["Client Layer"]
        WEB[Web App\nReact]
        MOB[Mobile App\nFlutter]
    end

    subgraph Gateway["API Gateway"]
        GW[Kong Gateway\nRate Limiting / Auth]
    end

    subgraph Services["Microservices"]
        US[User Service\n:8001]
        PS[Product Service\n:8002]
        OS[Order Service\n:8003]
        NS[Notification Service\n:8004]
        INV[Inventory Service\n:8005]
    end

    subgraph Messaging["Message Broker"]
        MQ[RabbitMQ]
    end

    subgraph Storage["Data Layer"]
        UDB[(User DB\nPostgreSQL)]
        PDB[(Product DB\nMongoDB)]
        ODB[(Order DB\nPostgreSQL)]
        CACHE[(Redis Cache)]
    end

    subgraph Observability["Observability"]
        LOG[Loki]
        MET[Prometheus]
        TR[Jaeger Tracing]
    end

    WEB --> GW
    MOB --> GW
    GW --> US
    GW --> PS
    GW --> OS

    US --> UDB
    US --> CACHE
    PS --> PDB
    PS --> CACHE
    OS --> ODB
    OS --> MQ

    MQ --> NS
    MQ --> INV

    US --> LOG
    PS --> LOG
    OS --> LOG
    US --> MET
    OS --> TR

    style Client fill:#e3f2fd,stroke:#1565c0
    style Gateway fill:#fff3e0,stroke:#e65100
    style Services fill:#e8f5e9,stroke:#2e7d32
    style Messaging fill:#fce4ec,stroke:#880e4f
    style Storage fill:#f3e5f5,stroke:#4a148c
    style Observability fill:#e0f2f1,stroke:#004d40
```

---

## 3. Mermaid: CI/CD Pipeline Sequence

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub
    participant CI as CI Runner
    participant REG as Container Registry
    participant STG as Staging
    participant PROD as Production
    participant MON as Monitoring

    Dev->>GH: git push feature/xyz
    GH-->>CI: Trigger pipeline (PR)

    rect rgb(230, 245, 255)
        Note over CI: Build Stage
        CI->>CI: Install dependencies
        CI->>CI: Run unit tests
        CI->>CI: Run lint & type check
        CI->>CI: Build Docker image
        CI-->>GH: Report test results
    end

    alt Tests Failed
        GH-->>Dev: Notify failure
    else Tests Passed
        GH-->>Dev: Request code review
        Dev->>GH: Approve & merge to main

        rect rgb(230, 255, 230)
            Note over CI: Release Stage
            CI->>CI: Build production image
            CI->>REG: Push image :latest & :sha
            REG-->>CI: Image digest confirmed
        end

        rect rgb(255, 250, 230)
            Note over CI,STG: Deploy to Staging
            CI->>STG: Deploy image
            STG->>STG: Run smoke tests
            STG-->>CI: Smoke tests passed
            CI->>CI: Run integration tests
        end

        alt Integration Failed
            CI-->>Dev: Notify rollback
            CI->>STG: Rollback to previous
        else Integration Passed
            Note over CI,PROD: Deploy to Production
            CI->>PROD: Blue/Green deploy
            PROD-->>MON: Register new deployment
            MON->>PROD: Health check
            PROD-->>MON: Healthy
            MON-->>Dev: Deployment successful
            CI->>PROD: Shift 100% traffic to green
            CI->>PROD: Terminate blue environment
        end
    end
```

---

## 4. Mermaid: Entity-Relationship Diagram

```mermaid
erDiagram
    CUSTOMER {
        uuid id PK
        string email UK
        string full_name
        string phone
        timestamp created_at
        timestamp updated_at
    }

    ADDRESS {
        uuid id PK
        uuid customer_id FK
        string street
        string city
        string state
        string zip_code
        string country
        boolean is_default
    }

    PRODUCT {
        uuid id PK
        uuid category_id FK
        string sku UK
        string name
        text description
        decimal price
        int stock_qty
        boolean is_active
    }

    CATEGORY {
        uuid id PK
        uuid parent_id FK
        string name
        string slug UK
    }

    ORDER {
        uuid id PK
        uuid customer_id FK
        uuid shipping_address_id FK
        string status
        decimal subtotal
        decimal discount
        decimal tax
        decimal total
        timestamp placed_at
        timestamp shipped_at
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
        decimal line_total
    }

    PAYMENT {
        uuid id PK
        uuid order_id FK
        string method
        string status
        decimal amount
        string transaction_ref
        timestamp paid_at
    }

    REVIEW {
        uuid id PK
        uuid customer_id FK
        uuid product_id FK
        int rating
        text comment
        timestamp created_at
    }

    CUSTOMER ||--o{ ADDRESS : "has"
    CUSTOMER ||--o{ ORDER : "places"
    CUSTOMER ||--o{ REVIEW : "writes"
    ORDER ||--o{ ORDER_ITEM : "contains"
    ORDER ||--|| PAYMENT : "paid via"
    ORDER }o--|| ADDRESS : "ships to"
    ORDER_ITEM }o--|| PRODUCT : "references"
    PRODUCT }o--|| CATEGORY : "belongs to"
    CATEGORY ||--o{ CATEGORY : "parent of"
    PRODUCT ||--o{ REVIEW : "receives"
```

---

## 5. PlantUML: Banking System Class Diagram

```plantuml
@startuml Banking System Class Diagram

skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor<<Entity>> LightBlue
    BackgroundColor<<Service>> LightGreen
    BackgroundColor<<Repository>> LightYellow
    BackgroundColor<<ValueObject>> LightPink
    BorderColor DarkSlateGray
    ArrowColor DarkSlateGray
}

package "Domain" {

    abstract class Account <<Entity>> {
        - id: UUID
        - accountNumber: String
        - balance: Money
        - status: AccountStatus
        - createdAt: LocalDateTime
        + getBalance(): Money
        + isActive(): boolean
        + {abstract} getAccountType(): AccountType
    }

    class CheckingAccount <<Entity>> {
        - overdraftLimit: Money
        - monthlyFee: Money
        + canOverdraw(amount: Money): boolean
        + getAccountType(): AccountType
    }

    class SavingsAccount <<Entity>> {
        - interestRate: BigDecimal
        - withdrawalLimit: int
        - currentMonthWithdrawals: int
        + accrueInterest(): void
        + getAccountType(): AccountType
    }

    class LoanAccount <<Entity>> {
        - principal: Money
        - interestRate: BigDecimal
        - termMonths: int
        - nextPaymentDate: LocalDate
        + calculateMonthlyPayment(): Money
        + getAccountType(): AccountType
    }

    class Customer <<Entity>> {
        - id: UUID
        - firstName: String
        - lastName: String
        - email: String
        - phone: String
        - kycStatus: KycStatus
        + getFullName(): String
        + isKycVerified(): boolean
    }

    class Transaction <<Entity>> {
        - id: UUID
        - type: TransactionType
        - amount: Money
        - timestamp: LocalDateTime
        - reference: String
        - description: String
        + isCredit(): boolean
        + isDebit(): boolean
    }

    class Money <<ValueObject>> {
        - amount: BigDecimal
        - currency: Currency
        + add(other: Money): Money
        + subtract(other: Money): Money
        + isGreaterThan(other: Money): boolean
        + isNegative(): boolean
    }

    enum AccountStatus <<ValueObject>> {
        ACTIVE
        FROZEN
        CLOSED
        PENDING_APPROVAL
    }

    enum TransactionType <<ValueObject>> {
        DEPOSIT
        WITHDRAWAL
        TRANSFER_IN
        TRANSFER_OUT
        INTEREST
        FEE
        LOAN_PAYMENT
    }
}

package "Application Services" {

    class AccountService <<Service>> {
        - accountRepo: AccountRepository
        - transactionRepo: TransactionRepository
        - eventPublisher: DomainEventPublisher
        + openAccount(cmd: OpenAccountCommand): Account
        + deposit(accountId: UUID, amount: Money): Transaction
        + withdraw(accountId: UUID, amount: Money): Transaction
        + transfer(fromId: UUID, toId: UUID, amount: Money): void
        + closeAccount(accountId: UUID): void
    }

    class CustomerService <<Service>> {
        - customerRepo: CustomerRepository
        - kycProvider: KycProvider
        + registerCustomer(cmd: RegisterCustomerCommand): Customer
        + verifyKyc(customerId: UUID): KycStatus
        + updateContactInfo(cmd: UpdateContactCommand): void
    }

    class LoanService <<Service>> {
        - loanRepo: AccountRepository
        - creditScoreProvider: CreditScoreProvider
        + applyForLoan(cmd: LoanApplicationCommand): LoanAccount
        + processPayment(loanId: UUID, payment: Money): Transaction
        + calculateAmortizationSchedule(loanId: UUID): List
    }
}

package "Infrastructure" {

    interface AccountRepository <<Repository>> {
        + findById(id: UUID): Optional<Account>
        + findByAccountNumber(num: String): Optional<Account>
        + findAllByCustomerId(customerId: UUID): List<Account>
        + save(account: Account): Account
        + delete(id: UUID): void
    }

    interface CustomerRepository <<Repository>> {
        + findById(id: UUID): Optional<Customer>
        + findByEmail(email: String): Optional<Customer>
        + save(customer: Customer): Customer
    }

    interface TransactionRepository <<Repository>> {
        + findById(id: UUID): Optional<Transaction>
        + findByAccountId(accountId: UUID): List<Transaction>
        + findByDateRange(from: LocalDate, to: LocalDate): List<Transaction>
        + save(tx: Transaction): Transaction
    }
}

Account <|-- CheckingAccount
Account <|-- SavingsAccount
Account <|-- LoanAccount
Account "1" *-- "many" Transaction : records
Account --> Money : balance
Account --> AccountStatus : status
Transaction --> Money : amount
Transaction --> TransactionType : type
Customer "1" *-- "many" Account : owns

AccountService ..> AccountRepository : uses
AccountService ..> TransactionRepository : uses
CustomerService ..> CustomerRepository : uses
LoanService ..> AccountRepository : uses

@enduml
```

---

## 6. PlantUML: Distributed Order Processing Sequence

```plantuml
@startuml Order Processing Sequence

skinparam sequenceMessageAlign center
skinparam responseMessageBelowArrow true
skinparam maxMessageSize 200

actor Customer
participant "API Gateway" as GW #LightBlue
participant "Order Service" as OS #LightGreen
participant "Inventory Service" as INV #LightYellow
participant "Payment Service" as PAY #LightPink
participant "Notification Service" as NS #LightGray
database "Order DB" as ODB #Wheat
queue "Message Bus\n(Kafka)" as BUS #Lavender

Customer -> GW: POST /orders\n{items, shippingAddress, paymentMethod}
activate GW

GW -> GW: Authenticate & rate-limit
GW -> OS: Forward request
activate OS

OS -> ODB: BEGIN TRANSACTION
activate ODB

OS -> INV: Reserve items\n[itemId[], quantities[]]
activate INV
INV -> INV: Check stock levels
alt Insufficient Stock
    INV --> OS: 409 CONFLICT\n{outOfStock: [...]}
    OS -> ODB: ROLLBACK
    OS --> GW: 422 Unprocessable\n{error: "Items out of stock"}
    GW --> Customer: 422 - Out of Stock
else Stock Available
    INV -> INV: Lock inventory records
    INV --> OS: 200 OK\n{reservationId}
    deactivate INV

    OS -> PAY: Authorize payment\n{amount, method, customerId}
    activate PAY
    PAY -> PAY: Validate card / wallet
    PAY -> PAY: Contact payment gateway
    alt Payment Declined
        PAY --> OS: 402 Payment Required\n{reason}
        OS -> INV: Release reservation\n{reservationId}
        OS -> ODB: ROLLBACK
        OS --> GW: 402 Payment Failed
        GW --> Customer: 402 - Payment Declined
    else Payment Authorized
        PAY --> OS: 200 OK\n{authCode, transactionId}
        deactivate PAY

        OS -> ODB: INSERT order\n{status: CONFIRMED}
        ODB --> OS: orderId
        OS -> ODB: COMMIT
        deactivate ODB

        OS -> BUS: Publish OrderConfirmed\n{orderId, customerId, items}
        activate BUS

        BUS -> INV: Deduct inventory
        activate INV
        INV -> INV: Commit stock deduction
        INV --> BUS: InventoryUpdated
        deactivate INV

        BUS -> NS: Send confirmation
        activate NS
        NS -> Customer: Email: Order Confirmed\n#{orderId}
        NS -> Customer: SMS: Your order is being processed
        NS --> BUS: NotificationSent
        deactivate NS

        deactivate BUS

        OS --> GW: 201 Created\n{orderId, estimatedDelivery}
        deactivate OS
        GW --> Customer: 201 - Order Confirmed\n{orderId}
        deactivate GW
    end
end

@enduml
```

---

## 7. PlantUML: Kubernetes Deployment Infrastructure

```plantuml
@startuml Kubernetes Deployment

skinparam rectangle {
    BackgroundColor<<cluster>> AliceBlue
    BackgroundColor<<namespace>> LightCyan
    BackgroundColor<<pod>> LightGreen
    BackgroundColor<<service>> LightYellow
    BackgroundColor<<storage>> Wheat
    BorderColor DarkSlateGray
}

rectangle "Kubernetes Cluster" <<cluster>> {

    rectangle "ingress-system" <<namespace>> {
        rectangle "Nginx Ingress Controller" <<pod>> as ING
    }

    rectangle "production" <<namespace>> {

        rectangle "Frontend Pods" <<pod>> as FE {
            rectangle "react-app:1.4.2\n(replicas: 3)" as FE1
        }

        rectangle "Backend Pods" <<pod>> as BE {
            rectangle "api-server:2.1.0\n(replicas: 5)" as BE1
        }

        rectangle "Worker Pods" <<pod>> as WK {
            rectangle "job-processor:1.0.1\n(replicas: 2)" as WK1
        }

        rectangle "Frontend Service\nClusterIP :80" <<service>> as FE_SVC
        rectangle "Backend Service\nClusterIP :8080" <<service>> as BE_SVC

        rectangle "PostgreSQL\nStatefulSet" <<storage>> as PG
        rectangle "Redis\nStatefulSet" <<storage>> as RD
        rectangle "PersistentVolumeClaim\n50Gi SSD" <<storage>> as PVC
    }

    rectangle "monitoring" <<namespace>> {
        rectangle "Prometheus\n+ Grafana" <<pod>> as MON
        rectangle "Loki\n+ Promtail" <<pod>> as LOG
    }

    rectangle "cert-manager" <<namespace>> {
        rectangle "cert-manager\nLet's Encrypt" <<pod>> as CERT
    }
}

cloud "Internet" as NET
database "AWS RDS\n(Managed)" as RDS
queue "AWS SQS" as SQS

NET --> ING : HTTPS :443
ING --> FE_SVC : /
ING --> BE_SVC : /api
FE_SVC --> FE
BE_SVC --> BE
BE --> RD : cache reads
BE --> PG : persistence
BE --> SQS : async jobs
SQS --> WK : consume messages
WK --> RDS : analytics writes
PG --> PVC : volume mount
MON --> FE : scrape metrics
MON --> BE : scrape metrics
LOG --> BE : collect logs
CERT --> ING : TLS certificate

@enduml
```

---

## Summary

| Diagram | Type | Complexity |
|---|---|---|
| E-Commerce Flowchart | Mermaid Flowchart | Complex branching with styles |
| Microservices Architecture | Mermaid Graph | Subgraphs & layered services |
| CI/CD Pipeline | Mermaid Sequence | Actors, loops, alt blocks |
| ER Diagram | Mermaid ERD | Full e-commerce schema |
| Banking Class Diagram | PlantUML Class | Inheritance, packages, enums |
| Order Processing | PlantUML Sequence | Distributed system, alt/loop |
| K8s Infrastructure | PlantUML Deployment | Cloud infrastructure layout |
