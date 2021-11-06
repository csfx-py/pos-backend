-- CREATE DATABASE pos;
-- \c pos
-- set extension
-- CREATE extension IF NOT EXISTS "uuid-ossp";
-- Create roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
-- add roles
INSERT INTO roles(name)
VALUES ('admin'),
    ('shop'),
    ('accountant');
-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
-- add categories
INSERT INTO categories(name)
VALUES('BEER'),
    ('BREEZER'),
    ('BRANDY'),
    ('GIN'),
    ('LIQUEUR'),
    ('RUM'),
    ('TEQUILA'),
    ('VODKA'),
    ('WHISKY'),
    ('WINE');
-- Create brands table
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
-- add brands
INSERT INTO brands(name)
VALUES('ABINBEV'),
    ('ASPRAIN'),
    ('B9 BEVERAGES'),
    ('CARLSBERG'),
    ('KALS'),
    ('SOM'),
    ('UB'),
    ('JP DISTILLERIES'),
    ('KALPATARU DISTI'),
    ('BACARDI'),
    ('AMRUT DISTILLERIES'),
    ('DIAGEO'),
    ('KHODAYS'),
    ('UGAR SUGARS'),
    ('UNITED SPIRITS'),
    ('RADICO'),
    ('SEAGRAM''S'),
    ('AB D'),
    ('BEAM GLOBAL'),
    ('JHONS'),
    ('UNIBIV'),
    ('BANGALORE'),
    ('ELITE'),
    ('FRATELLI'),
    ('GROVER'),
    ('INODOSPIRIT BEVERAGES'),
    ('RICO'),
    ('SULA');
-- Create sizes table
CREATE TABLE sizes (
    id SERIAL PRIMARY KEY,
    size INTEGER UNIQUE NOT NULL
);
-- add sizes
INSERT INTO sizes (size)
VALUES (50),
    (60),
    (90),
    (180),
    (187),
    (200),
    (250),
    (275),
    (330),
    (375),
    (500),
    (650),
    (700),
    (750),
    (1000);
-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    brands_id integer,
    categories_id integer NOT NULL,
    sizes_id INTEGER NOT NULL,
    barcode TEXT UNIQUE,
    purchase_price DECIMAL(10, 2) NOT NULL,
    case_qty INTEGER NOT NULL,
    case_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    mrp DECIMAL(10, 2) NOT NULL,
    mrp1 DECIMAL(10, 2),
    mrp2 DECIMAL(10, 2),
    mrp3 DECIMAL(10, 2),
    mrp4 DECIMAL(10, 2),
    CONSTRAINT categories_id FOREIGN KEY(categories_id) REFERENCES categories(id) ON DELETE
    SET NULL,
        CONSTRAINT brands_id FOREIGN KEY(brands_id) REFERENCES brands(id) ON DELETE
    SET NULL,
        CONSTRAINT sizes_id FOREIGN KEY(sizes_id) REFERENCES sizes(id) ON DELETE
    SET NULL
);
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    roles_id integer NOT NULL,
    is_priviledged BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT roles_id FOREIGN KEY(roles_id) REFERENCES roles(id) ON DELETE
    SET NULL
);
-- Create shops table
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    license TEXT NOT NULL,
    price_to_use TEXT NOT NULL
);
-- CREATE domains table
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    users_id integer NOT NULL,
    shops_id integer NOT NULL,
    CONSTRAINT users_id FOREIGN KEY(users_id) REFERENCES users(id) ON DELETE
    SET NULL,
    CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE
    SET NULL
);
-- Create stock table
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    products_id INTEGER NOT NULL,
    shops_id INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    CONSTRAINT products_id FOREIGN KEY(products_id) REFERENCES products(id) ON DELETE
    SET NULL,
        CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE
    SET NULL
);
-- Create purchase table
CREATE TABLE purchase (
    id SERIAL PRIMARY KEY,
    products_id INTEGER NOT NULL REFERENCES products(id),
    shops_id INTEGER NOT NULL REFERENCES shops(id),
    price DECIMAL(10, 2) NOT NULL,
    qty_case integer NOT NULL,
    qty_item integer NOT NULL,
    purchase_date date NOT NULL DEFAULT CURRENT_DATE,
    inserted_at DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT products_id FOREIGN KEY(products_id) REFERENCES products(id) ON DELETE
    SET NULL,
        CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE
    SET NULL
);
-- add shops
insert into shops(name, license, price_to_use)
values('shop1', 'dfs344sd', 'mrp2'),
    ('shop2', 'dasf3443fsd', 'mrp3'),
    ('shop3', 'sfg4dfg45db', 'mrp3');
insert into products(
    name, brands_id, categories_id, sizes_id, barcode, case_qty, purchase_price, case_price, mrp, discount, mrp1, mrp2, mrp3, mrp4 )
VALUES( 'BECKS ICE PREMIUM 500ML CAN', 1, 1, 11, '1234567890', 24, 62.00, 1630.00, 70.00, 0.7, 70.00, 72.00, 75.00, 75.00 ),
      ( 'BECKS ICE PREMIUM 650ML', 1, 1, 12, '1234567891', 12, 131.82, 1581.84, 145.00, 1.45, 145.00, 150.00, 150.00, 150.00 );

-- CREATE sales table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    sales_date DATE DEFAULT CURRENT_DATE,
    shops_id INTEGER NOT NULL,
    products_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    qty_cash INTEGER,
    qty_card INTEGER,
    qty_upi INTEGER,
    inserted_at DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT products_id FOREIGN KEY(products_id) REFERENCES products(id) ON DELETE
    SET NULL,
        CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE
    SET NULL
);

-- CREATE invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    sales_no VARCHAR(255) NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(255) NOT NULL,
    shops_id INTEGER NOT NULL,
    users_id INTEGER NOT NULL,
    products_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(255) DEFAULT 'cash' NOT NULL,
    inserted_at DATE DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT products_id FOREIGN KEY(products_id) REFERENCES products(id) ON DELETE
    SET NULL,
        CONSTRAINT users_id FOREIGN KEY(users_id) REFERENCES users(id) ON DELETE
    SET NULL,
        CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE
    SET NULL
);