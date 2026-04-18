import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async findAll() {
    return this.studentRepository.find({
      relations: ['user'],
    });
  }

  async findOne(userId: string) {
    const student = await this.studentRepository.findOne({
      where: { userId },
      relations: ['user', 'currentRoom', 'currentRoom.hostel'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async findByRollNumber(rollNumber: string) {
    const student = await this.studentRepository.findOne({
      where: { rollNumber },
      relations: ['user'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(userId: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.findOne(userId);

    Object.assign(student, updateStudentDto);
    return this.studentRepository.save(student);
  }
}
