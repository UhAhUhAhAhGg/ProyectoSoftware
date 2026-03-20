-- Created by Redgate Data Modeler (https://datamodeler.redgate-platform.com)
-- Last modification date: 2026-03-17 03:33:30.921

-- tables
-- Table: Admin_Profile
CREATE TABLE Admin_Profile (
    User_id uuid  NOT NULL,
    employee_code varchar(50)  NOT NULL,
    department varchar(50)  NOT NULL,
    CONSTRAINT Admin_Profile_pk PRIMARY KEY (User_id)
);

-- Table: Buyer_Profile
CREATE TABLE Buyer_Profile (
    User_id uuid  NOT NULL,
    CONSTRAINT Buyer_Profile_pk PRIMARY KEY (User_id)
);

-- Table: Category
CREATE TABLE Category (
    id uuid  NOT NULL,
    name varchar(100)  NOT NULL,
    description text  NOT NULL,
    is_active boolean  NOT NULL,
    CONSTRAINT Category_pk PRIMARY KEY (id)
);

-- Table: Event
CREATE TABLE Event (
    id uuid  NOT NULL,
    pomoter_id uuid  NOT NULL,
    name varchar(200)  NOT NULL,
    description text  NOT NULL,
    event_date date  NOT NULL,
    event_time time  NOT NULL,
    location varchar(255)  NOT NULL,
    capacity int  NOT NULL,
    status varchar(50)  NOT NULL,
    created_at timestamp  NOT NULL,
    Category_id uuid  NOT NULL,
    CONSTRAINT Event_pk PRIMARY KEY (id)
);

-- Table: Permission
CREATE TABLE Permission (
    id uuid  NOT NULL,
    name varchar(100)  NOT NULL,
    CONSTRAINT Privilegio_pk PRIMARY KEY (id)
);

-- Table: Promotor_Profile
CREATE TABLE Promotor_Profile (
    User_id uuid  NOT NULL,
    company_name varchar(100)  NOT NULL,
    comercial_nit varchar(50)  NOT NULL,
    bank_account varchar(50)  NOT NULL,
    CONSTRAINT Promotor_Profile_pk PRIMARY KEY (User_id)
);

-- Table: Role
CREATE TABLE Role (
    id uuid  NOT NULL,
    name varchar(50)  NOT NULL,
    CONSTRAINT Rol_pk PRIMARY KEY (id)
);

-- Table: Role_Permission
CREATE TABLE Role_Permission (
    Role_id uuid  NOT NULL,
    Permission_id uuid  NOT NULL,
    CONSTRAINT Role_Permission_pk PRIMARY KEY (Role_id,Permission_id)
);

-- Table: Ticket_Type
CREATE TABLE Ticket_Type (
    id uuid  NOT NULL,
    Event_id uuid  NOT NULL,
    name varchar(100)  NOT NULL,
    description text  NOT NULL,
    price decimal(10,2)  NOT NULL,
    max_capacity int  NOT NULL,
    status varchar(50)  NOT NULL,
    CONSTRAINT Ticket_Type_pk PRIMARY KEY (id)
);

-- Table: User
CREATE TABLE "User" (
    id uuid  NOT NULL,
    email varchar(255)  NOT NULL,
    password_hash varchar(255)  NOT NULL,
    is_active boolean  NOT NULL,
    reset_token varchar(255)  NOT NULL,
    reset_token_expires timestamp  NOT NULL,
    created_at timestamp  NOT NULL,
    deleted_at timestamp  NOT NULL,
    Role_id uuid  NOT NULL,
    CONSTRAINT User_pk PRIMARY KEY (id)
);

-- Table: User_Profile
CREATE TABLE User_Profile (
    user_id uuid  NOT NULL,
    first_name varchar(100)  NOT NULL,
    last_name varchar(100)  NOT NULL,
    phone varchar(50)  NOT NULL,
    date_of_birth date  NOT NULL,
    profile_photo_url varchar(255)  NOT NULL,
    CONSTRAINT User_Profile_pk PRIMARY KEY (user_id)
);

-- foreign keys
-- Reference: Buyer_Profile_User (table: Buyer_Profile)
ALTER TABLE Buyer_Profile ADD CONSTRAINT Buyer_Profile_User
    FOREIGN KEY (User_id)
    REFERENCES User_Profile (user_id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Event_Category (table: Event)
ALTER TABLE Event ADD CONSTRAINT Event_Category
    FOREIGN KEY (Category_id)
    REFERENCES Category (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Promotor_Profile_User (table: Promotor_Profile)
ALTER TABLE Promotor_Profile ADD CONSTRAINT Promotor_Profile_User
    FOREIGN KEY (User_id)
    REFERENCES User_Profile (user_id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Role_Permission_Permission (table: Role_Permission)
ALTER TABLE Role_Permission ADD CONSTRAINT Role_Permission_Permission
    FOREIGN KEY (Permission_id)
    REFERENCES Permission (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Role_Permission_Role (table: Role_Permission)
ALTER TABLE Role_Permission ADD CONSTRAINT Role_Permission_Role
    FOREIGN KEY (Role_id)
    REFERENCES Role (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Table_7_User (table: Admin_Profile)
ALTER TABLE Admin_Profile ADD CONSTRAINT Table_7_User
    FOREIGN KEY (User_id)
    REFERENCES User_Profile (user_id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Ticket_Type_Event (table: Ticket_Type)
ALTER TABLE Ticket_Type ADD CONSTRAINT Ticket_Type_Event
    FOREIGN KEY (Event_id)
    REFERENCES Event (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: User_Role (table: User)
ALTER TABLE "User" ADD CONSTRAINT User_Role
    FOREIGN KEY (Role_id)
    REFERENCES Role (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- End of file.

