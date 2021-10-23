-- CREATE DATABASE pos;
-- \c pos
-- set extension
-- CREATE extension IF NOT EXISTS "uuid-ossp";
-- Create roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    roles_id integer NOT NULL,
    is_priviledged BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT roles_id FOREIGN KEY(roles_id) REFERENCES roles(id) ON DELETE SET NULL
);
-- Create shops table
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    license TEXT NOT NULL
);
-- CREATE domains table
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    users_id integer NOT NULL,
    shops_id integer NOT NULL,
    CONSTRAINT users_id FOREIGN KEY(users_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE SET NULL

);
-- Create brands table
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
-- Create sizes table
CREATE TABLE sizes (
    id SERIAL PRIMARY KEY,
    size INTEGER UNIQUE NOT NULL
);
-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    brands_id integer NOT NULL,
    categories_id integer NOT NULL,
    sizes_id INTEGER NOT NULL,
    barcode TEXT UNIQUE,
    per_case INTEGER NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    case_price DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    mrp1 DECIMAL(10, 2),
    mrp2 DECIMAL(10, 2),
    mrp3 DECIMAL(10, 2),
    mrp4 DECIMAL(10, 2),
    CONSTRAINT categories_id FOREIGN KEY(categories_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT brands_id FOREIGN KEY(brands_id) REFERENCES brands(id) ON DELETE SET NULL,
    CONSTRAINT sizes_id FOREIGN KEY(sizes_id) REFERENCES sizes(id) ON DELETE SET NULL
);
-- Create stock table
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    products_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    CONSTRAINT products_id FOREIGN KEY(products_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT shop_id FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE SET NULL
);
-- Create purchase table
CREATE TABLE purchase (
    id SERIAL PRIMARY KEY,
    products_id INTEGER NOT NULL REFERENCES products(id),
    shops_id INTEGER NOT NULL REFERENCES shops(id),
    price INTEGER NOT NULL,
    qty_case integer NOT NULL,
    qty_item integer NOT NULL,
    purchase_date date NOT NULL,
    CONSTRAINT products_id FOREIGN KEY(products_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT shops_id FOREIGN KEY(shops_id) REFERENCES shops(id) ON DELETE SET NULL
);
-- add roles
INSERT INTO roles
VALUES ('admin'),
    ('shop'),
    ('accountant');
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